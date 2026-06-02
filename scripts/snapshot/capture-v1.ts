/**
 * Capture v1 winners — targeted freeze of the production (anamaya.com)
 * pages that the v1↔v2 comparison marked as newer-on-v1 or only-on-v1.
 *
 * The main v2 freeze (phase-a/b/c) only ever captured staging. This
 * script fills the gap for the ~79 pages where production is the most
 * recent (or only) version, WITHOUT touching the v2 artifacts: it reads
 * the target list from migration/content-diff.json, fetches each live
 * page from anamaya.com, downloads its assets to the same Supabase
 * `snapshot` bucket (idempotent by URL hash), rewrites the HTML, and
 * upserts frozen_html into content_items for the v1 url_inventory row.
 *
 * Raw HTML + the asset map are also written under migration/snapshot-v1/
 * so the retreat React-rebuild step can extract bodies + media from the
 * same capture.
 *
 * Resumable: cached HTML on disk is reused; assets already in the
 * manifest are skipped.
 *
 * Run: npm run snapshot:capture-v1
 */

import { existsSync, readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { sb } from "../extractor/lib";
import {
  BUCKET,
  extractAssets,
  extractCssRefs,
  fetchBytes,
  fetchText,
  isTracking,
  publicStorageUrl,
  rewriteHtmlAssets,
  storagePathFor,
  uploadAsset,
  urlExtension,
  type Asset,
  type AssetMap,
} from "./snapshot-core";

const OUT_DIR = resolve(process.cwd(), "migration/snapshot-v1");
const HTML_DIR = resolve(OUT_DIR, "html");
const MANIFEST_PATH = resolve(OUT_DIR, "asset-storage.json");
const REPORT_PATH = resolve(OUT_DIR, "capture-report.json");
const DIFF_PATH = resolve(process.cwd(), "migration/content-diff.json");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const PAGE_CONCURRENCY = 4; // polite to the live production host
const ASSET_CONCURRENCY = 10;

type Target = { url_path: string; post_type: string; reason: "newer" | "only" };
type PageRow = { id: string; url: string; url_path: string; post_type: string };
type StorageRecord = { url: string; storage_path: string; content_type: string };
type Manifest = Record<string, StorageRecord>;
type PageReport = {
  url_path: string;
  post_type: string;
  status: "ok" | "db-error" | "no-html";
  error?: string;
  rewritten?: number;
  unmatched?: number;
};

// Shapes of the bits of content-diff.json we read.
type DiffRow = { url_path: string; post_type: string | null; newer_side?: string };
type DiffFile = { diffs: DiffRow[]; v1_only: DiffRow[] };
type InvRow = { id: string; url: string; url_path: string; post_type: string };

// ---------------------------------------------------------------
const FORM_TARGETS_PATH = resolve(OUT_DIR, "form-targets.json");

function computeTargets(): Target[] {
  const diff = JSON.parse(readFileSync(DIFF_PATH, "utf8")) as DiffFile;
  const targets: Target[] = [];
  for (const d of diff.diffs) {
    if (d.newer_side === "v1" && d.post_type && d.post_type !== "attachment") {
      targets.push({ url_path: d.url_path, post_type: d.post_type, reason: "newer" });
    }
  }
  for (const r of diff.v1_only) {
    if (r.post_type && r.post_type !== "attachment") {
      targets.push({ url_path: r.url_path, post_type: r.post_type, reason: "only" });
    }
  }
  // Form-bearing pages: production (v1) replaced WordPress FluentForms with
  // GHL/Sereenly embeds, so we capture v1 for every page that still serves a
  // (dead) FluentForm from v2 and force it to serve v1 (see form-targets.json,
  // built from the v2 FluentForm scan ∩ pages that have a v1 equivalent).
  if (existsSync(FORM_TARGETS_PATH)) {
    const formPaths = JSON.parse(readFileSync(FORM_TARGETS_PATH, "utf8")) as string[];
    for (const p of formPaths) {
      targets.push({ url_path: p, post_type: "form-page", reason: "only" });
    }
  }
  // De-dup by url_path (a path can't be both newer and only, but be safe).
  const seen = new Set<string>();
  return targets.filter((t) => {
    const k = t.url_path.replace(/\/$/, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function resolveRows(targets: Target[]): Promise<PageRow[]> {
  const c = sb();
  const rows: InvRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await c
      .from("url_inventory")
      .select("id, url, url_path, post_type")
      .eq("source_site", "v1")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as InvRow[]));
    if (data.length < 1000) break;
    from += 1000;
  }
  const byPath = new Map<string, InvRow>();
  for (const r of rows) {
    byPath.set(r.url_path, r);
    byPath.set(r.url_path.replace(/\/$/, ""), r);
  }
  const out: PageRow[] = [];
  const missing: string[] = [];
  for (const t of targets) {
    const hit =
      byPath.get(t.url_path) ||
      byPath.get(t.url_path + "/") ||
      byPath.get(t.url_path.replace(/\/$/, ""));
    if (hit) out.push({ id: hit.id, url: hit.url, url_path: hit.url_path, post_type: hit.post_type });
    else missing.push(t.url_path);
  }
  if (missing.length) {
    console.log(`  ⚠ ${missing.length} target paths had no v1 url_inventory row:`);
    missing.forEach((m) => console.log(`    ${m}`));
  }
  return out;
}

// ---------------------------------------------------------------
// Phase 1 — fetch all page HTML (cached on disk).
// ---------------------------------------------------------------
async function fetchAllHtml(
  rows: PageRow[],
): Promise<Map<string, { html: string; assets: Asset[] }>> {
  const result = new Map<string, { html: string; assets: Asset[] }>();
  let i = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= rows.length) return;
      const row = rows[idx];
      const htmlPath = resolve(HTML_DIR, `${row.id}.html`);
      let html: string;
      if (existsSync(htmlPath)) {
        html = await readFile(htmlPath, "utf8");
      } else {
        const res = await fetchText(row.url);
        if (!res.ok || !res.html) {
          console.log(`  ✗ [${++done}/${rows.length}] ${row.url} — ${res.error ?? res.status}`);
          continue;
        }
        html = res.html;
        await writeFile(htmlPath, html, "utf8");
      }
      result.set(row.id, { html, assets: extractAssets(html, row.url) });
      console.log(`  ✓ [${++done}/${rows.length}] ${row.url_path}`);
    }
  }
  await Promise.all(Array.from({ length: PAGE_CONCURRENCY }, () => worker()));
  return result;
}

// ---------------------------------------------------------------
// Phase 2 — download every referenced asset (with CSS recursion).
// ---------------------------------------------------------------
async function downloadAssets(
  pages: Map<string, { html: string; assets: Asset[] }>,
  manifest: Manifest,
): Promise<void> {
  const client = sb();
  const queue: string[] = [];
  const enqueued = new Set<string>(Object.keys(manifest));
  for (const { assets } of pages.values()) {
    for (const a of assets) {
      if (!enqueued.has(a.url) && !isTracking(a.url)) {
        enqueued.add(a.url);
        queue.push(a.url);
      }
    }
  }
  console.log(`  ${queue.length} new assets to download (${Object.keys(manifest).length} already cached)`);

  let done = 0;
  let untilSave = 100;
  const cssQueue: string[] = [];

  async function processOne(url: string): Promise<void> {
    const fetched = await fetchBytes(url);
    if (!fetched.ok) {
      done++;
      return;
    }
    const storagePath = storagePathFor(url);
    const up = await uploadAsset(client, storagePath, fetched.bytes, fetched.contentType);
    done++;
    if (!up.ok) return;
    manifest[url] = { url, storage_path: storagePath, content_type: fetched.contentType };
    if (fetched.contentType.includes("text/css") || urlExtension(url) === "css") {
      const css = new TextDecoder("utf-8").decode(fetched.bytes);
      for (const ref of extractCssRefs(css, url)) {
        if (!enqueued.has(ref) && !isTracking(ref)) {
          enqueued.add(ref);
          cssQueue.push(ref);
        }
      }
    }
  }

  while (queue.length > 0 || cssQueue.length > 0) {
    const batch: string[] = [];
    while (batch.length < ASSET_CONCURRENCY && queue.length > 0) batch.push(queue.shift()!);
    while (batch.length < ASSET_CONCURRENCY && cssQueue.length > 0) batch.push(cssQueue.shift()!);
    if (batch.length === 0) break;
    await Promise.all(batch.map(processOne));
    if ((untilSave -= batch.length) <= 0) {
      await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
      untilSave = 100;
    }
    if (done % 50 < batch.length) {
      console.log(`  …${done} assets processed, ${queue.length + cssQueue.length} queued`);
    }
  }
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

// ---------------------------------------------------------------
// Phase 3 — rewrite each page + upsert frozen_html.
// ---------------------------------------------------------------
async function rewriteAndPersist(
  rows: PageRow[],
  pages: Map<string, { html: string; assets: Asset[] }>,
  manifest: Manifest,
): Promise<PageReport[]> {
  const client = sb();
  const assetMap: AssetMap = new Map();
  for (const r of Object.values(manifest)) {
    assetMap.set(r.url, publicStorageUrl(SUPABASE_URL, r.storage_path));
  }
  const report: PageReport[] = [];
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= rows.length) return;
      const row = rows[idx];
      const page = pages.get(row.id);
      if (!page) {
        report.push({ url_path: row.url_path, post_type: row.post_type, status: "no-html" });
        continue;
      }
      const { html, rewritten, unmatched } = rewriteHtmlAssets(page.html, row.url, assetMap);
      const { error } = await client.from("content_items").upsert(
        { url_inventory_id: row.id, frozen_html: html, frozen_at: new Date().toISOString() },
        { onConflict: "url_inventory_id" },
      );
      report.push({
        url_path: row.url_path,
        post_type: row.post_type,
        status: error ? "db-error" : "ok",
        error: error?.message,
        rewritten,
        unmatched,
      });
    }
  }
  await Promise.all(Array.from({ length: 5 }, () => worker()));
  return report;
}

// ---------------------------------------------------------------
async function main() {
  console.log("Capture v1 winners — targeted production freeze");
  await mkdir(HTML_DIR, { recursive: true });

  const targets = computeTargets();
  console.log(`→ ${targets.length} target paths from content-diff.json`);
  const rows = await resolveRows(targets);
  console.log(`→ ${rows.length} resolved to v1 url_inventory rows`);
  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.post_type] = (byType[r.post_type] || 0) + 1;
  console.log(`  by post_type: ${JSON.stringify(byType)}`);

  console.log("\n→ Phase 1: fetch page HTML");
  const pages = await fetchAllHtml(rows);

  console.log("\n→ Phase 2: download assets to Storage");
  const manifest: Manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(await readFile(MANIFEST_PATH, "utf8"))
    : {};
  await downloadAssets(pages, manifest);
  console.log(`  manifest now holds ${Object.keys(manifest).length} assets`);

  console.log("\n→ Phase 3: rewrite + upsert frozen_html");
  const report = await rewriteAndPersist(rows, pages, manifest);
  const ok = report.filter((r) => r.status === "ok").length;
  const dbErr = report.filter((r) => r.status === "db-error");
  const noHtml = report.filter((r) => r.status === "no-html");
  console.log(`  ${ok} frozen, ${noHtml.length} no-html, ${dbErr.length} db-errors`);
  if (dbErr.length) dbErr.slice(0, 10).forEach((e) => console.log(`    ✗ ${e.url_path} — ${e.error}`));

  await writeFile(
    REPORT_PATH,
    JSON.stringify(
      { generated_at: new Date().toISOString(), bucket: BUCKET, targets: targets.length, resolved: rows.length, ok, no_html: noHtml.length, db_errors: dbErr.length, by_type: byType, report },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
