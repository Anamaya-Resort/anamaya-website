/**
 * Targeted freshness refresh — re-pull the handful of live anamaya.com
 * pages whose content changed AFTER our Jun-2 capture, so the launch site
 * matches production. Scope is an explicit allow-list (not the whole site)
 * so the production DB write is small and auditable.
 *
 *   • snapshot pages/ytt  → re-fetch live HTML, download any new assets to
 *                           Storage, rewrite, upsert content_items.frozen_html
 *   • retreats            → re-scrape the Elementor single-post body and
 *                           upsert content_items.scraped_body_html (this is
 *                           what the native /retreat/[slug] page renders)
 *
 * All live fetches use a real browser UA because anamaya.com sits behind
 * Cloudflare bot rules that 403 generic agents.
 *
 * Run: npx tsx scripts/snapshot/refresh-stale.ts
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { sb } from "../extractor/lib";
import {
  BUCKET,
  extractAssets,
  extractCssRefs,
  isTracking,
  publicStorageUrl,
  rewriteHtmlAssets,
  storagePathFor,
  uploadAsset,
  urlExtension,
  type AssetMap,
} from "./snapshot-core";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const MANIFEST_PATH = resolve(process.cwd(), "migration/snapshot-v1/asset-storage.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Items whose live `modified` is newer than our frozen_at/scraped_at.
const SNAPSHOT_PATHS = [
  "/personalized-retreats/",
  "/ytt/200-hr-yoga-teacher-training-michelle-lehegarate-danielle-hoguet/",
  "/ytt/200-hr-yoga-teacher-training-wild-heart-yoga-jordan-stinson/",
];
const RETREAT_PATHS = [
  "/retreat/primal-return-retreat-costa-rica-sierra-kliscz/",
  "/retreat/breathwork-and-cacao-yoga-retreat-cristiane-machado/",
];

type StorageRecord = { url: string; storage_path: string; content_type: string };
type Manifest = Record<string, StorageRecord>;

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    console.log(`  ✗ fetch ${url} → ${res ? res.status : "network error"}`);
    return null;
  }
  return res.text();
}

async function fetchBytesBrowser(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(45_000),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

// --- the two helpers from scrape-retreat-bodies.ts (not exported there) ---
const CONTAINER_START_RE = /<div\s+data-elementor-type="single(?:-post)?"[^>]*>/i;
function stripHeadAndShell(html: string): string | null {
  const startMatch = html.match(CONTAINER_START_RE);
  if (!startMatch || startMatch.index === undefined) return null;
  const start = startMatch.index;
  let i = html.indexOf(">", start) + 1;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = i;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index + match[0].length);
  }
  return null;
}
function cleanHtml(html: string): string {
  let out = html;
  out = out.replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(script|style|template|noscript)\b[^>]*\/?>/gi, "");
  out = out.replace(/\snitro-[a-z-]+="[^"]*"/gi, "");
  out = out.replace(/\sdata-nitro[a-z-]*="[^"]*"/gi, "");
  out = out.replace(/\s+>/g, ">");
  return out;
}

async function resolveV1Row(path: string) {
  const c = sb();
  const variants = [path, path.replace(/\/$/, "")];
  const { data } = await c
    .from("url_inventory")
    .select("id, url, url_path, post_type")
    .in("url_path", variants)
    .eq("source_site", "v1")
    .limit(1);
  return data?.[0] ?? null;
}

async function main() {
  const c = sb();
  const manifest: Manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(await readFile(MANIFEST_PATH, "utf8"))
    : {};

  // ---------- snapshot pages / ytt → refresh frozen_html ----------
  for (const path of SNAPSHOT_PATHS) {
    const row = await resolveV1Row(path);
    if (!row) {
      console.log(`MISSING v1 row: ${path}`);
      continue;
    }
    console.log(`\n→ snapshot refresh: ${path}`);
    const html = await fetchHtml(row.url);
    if (!html) continue;

    // download any assets we don't already have
    const assets = extractAssets(html, row.url);
    let newAssets = 0;
    for (const a of assets) {
      if (manifest[a.url] || isTracking(a.url)) continue;
      const got = await fetchBytesBrowser(a.url);
      if (!got) continue;
      const storagePath = storagePathFor(a.url);
      const up = await uploadAsset(c, storagePath, got.bytes, got.contentType);
      if (!up.ok) continue;
      manifest[a.url] = { url: a.url, storage_path: storagePath, content_type: got.contentType };
      newAssets++;
      // shallow CSS recursion
      if (got.contentType.includes("text/css") || urlExtension(a.url) === "css") {
        const css = new TextDecoder("utf-8").decode(got.bytes);
        for (const ref of extractCssRefs(css, a.url)) {
          if (manifest[ref] || isTracking(ref)) continue;
          const cg = await fetchBytesBrowser(ref);
          if (!cg) continue;
          const sp = storagePathFor(ref);
          if ((await uploadAsset(c, sp, cg.bytes, cg.contentType)).ok) {
            manifest[ref] = { url: ref, storage_path: sp, content_type: cg.contentType };
            newAssets++;
          }
        }
      }
    }

    const assetMap: AssetMap = new Map();
    for (const r of Object.values(manifest)) {
      assetMap.set(r.url, publicStorageUrl(SUPABASE_URL, r.storage_path));
    }
    const { html: rewritten, rewritten: n, unmatched } = rewriteHtmlAssets(html, row.url, assetMap);
    const { error } = await c.from("content_items").upsert(
      { url_inventory_id: row.id, frozen_html: rewritten, frozen_at: new Date().toISOString() },
      { onConflict: "url_inventory_id" },
    );
    console.log(
      `  ${error ? "✗ " + error.message : "✓ frozen"} (${html.length}b, +${newAssets} assets, ${n} rewritten, ${unmatched} unmatched)`,
    );
  }

  // ---------- retreats → refresh scraped_body_html ----------
  for (const path of RETREAT_PATHS) {
    const row = await resolveV1Row(path);
    if (!row) {
      console.log(`MISSING v1 row: ${path}`);
      continue;
    }
    console.log(`\n→ retreat re-scrape: ${path}`);
    const html = await fetchHtml(row.url);
    if (!html) continue;
    const container = stripHeadAndShell(html);
    const body = container ? cleanHtml(container) : null;
    if (!body || body.length < 500) {
      console.log(`  ✗ could not extract body (got ${body?.length ?? 0}b)`);
      continue;
    }
    const { error } = await c.from("content_items").upsert(
      { url_inventory_id: row.id, scraped_body_html: body, scraped_at: new Date().toISOString() },
      { onConflict: "url_inventory_id" },
    );
    console.log(`  ${error ? "✗ " + error.message : "✓ scraped"} (${body.length}b)`);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nDone. Manifest holds ${Object.keys(manifest).length} assets (bucket: ${BUCKET}).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
