/**
 * Snapshot Phase C — HTML rewrite + persist.
 *
 * Reads each page's raw HTML from migration/snapshot/html/{id}.html,
 * rewrites every CSS / JS / image / font URL to point at the public
 * Supabase Storage URL recorded in asset-storage.json (Phase B), and
 * upserts the rewritten HTML into content_items.frozen_html for that
 * url_inventory_id.
 *
 * URL detection mirrors Phase A so the same set of references gets
 * rewritten — link href, script src, img src/srcset/data-src, source
 * src/srcset, video src/poster, audio src, and url(...) in any
 * <style> block or style attribute. References whose URL isn't in
 * the storage manifest (e.g. tracking pixels we deliberately
 * skipped) are left as-is.
 *
 * Run: npm run snapshot:rewrite
 *
 * Requires:
 *   - migration/snapshot/html/*.html exists (Phase A)
 *   - migration/snapshot/asset-storage.json exists (Phase B)
 *   - supabase/migrations/0049_content_items_frozen_html.sql applied
 */

import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { sb } from "../extractor/lib";

const OUT_DIR = resolve(process.cwd(), "migration/snapshot");
const HTML_DIR = resolve(OUT_DIR, "html");
const REWRITE_REPORT = resolve(OUT_DIR, "rewrite-report.json");
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const BUCKET = "snapshot";

const DB_BATCH = 25;
const DB_CONCURRENCY = 5;

type StorageRecord = {
  url: string;
  storage_path: string;
  bytes: number;
  content_type: string;
  internal: boolean;
  origin: string;
  downloaded_at: string;
};

type AssetMap = Map<string, string>; // original URL → public storage URL

type PageRow = { id: string; url: string };

type RewriteResult = {
  id: string;
  url: string;
  status: "ok" | "no-html" | "db-error";
  rewritten_count?: number;
  unmatched_count?: number;
  bytes_in?: number;
  bytes_out?: number;
  error?: string;
};

// ---------------------------------------------------------------
function publicStorageUrl(storagePath: string): string {
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function loadAssetMap(records: Record<string, StorageRecord>): AssetMap {
  const map: AssetMap = new Map();
  for (const r of Object.values(records)) {
    map.set(r.url, publicStorageUrl(r.storage_path));
  }
  return map;
}

// ---------------------------------------------------------------
// Resolve a possibly-relative href against the page URL. Mirror of
// Phase A's resolveUrl so we look up the same key the manifest used.
// ---------------------------------------------------------------
function resolveUrl(href: string, base: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("#")
  ) {
    return null;
  }
  try {
    const u = new URL(trimmed, base);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// Rewrite a single attribute value (e.g. one href) — returns the
// new value (or the original if no mapping exists). Handles plain
// URLs only; srcset is handled separately.
// ---------------------------------------------------------------
function rewriteUrl(
  raw: string,
  pageUrl: string,
  assets: AssetMap,
  counters: { rewritten: number; unmatched: number },
): string {
  const resolved = resolveUrl(raw, pageUrl);
  if (!resolved) return raw;
  const replacement = assets.get(resolved);
  if (!replacement) {
    counters.unmatched++;
    return raw;
  }
  counters.rewritten++;
  return replacement;
}

function rewriteSrcset(
  raw: string,
  pageUrl: string,
  assets: AssetMap,
  counters: { rewritten: number; unmatched: number },
): string {
  // srcset = "url 1x, url 2x" or "url 600w, url 1200w" — preserve
  // the descriptor part, only rewrite the URL.
  return raw
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const sp = trimmed.split(/\s+/);
      const url = sp[0];
      const descriptor = sp.slice(1).join(" ");
      const newUrl = rewriteUrl(url, pageUrl, assets, counters);
      return descriptor ? `${newUrl} ${descriptor}` : newUrl;
    })
    .join(", ");
}

// ---------------------------------------------------------------
// Walk the HTML and rewrite every asset reference. Same shape as
// Phase A's extractor but mutating instead of collecting.
// ---------------------------------------------------------------
function rewriteHtml(
  html: string,
  pageUrl: string,
  assets: AssetMap,
): { html: string; rewritten: number; unmatched: number } {
  const counters = { rewritten: 0, unmatched: 0 };

  // Replace inside an attribute by re-emitting the attribute with
  // the new value. We use anchored regexes that capture the whole
  // attr so surrounding whitespace and quote style are preserved.

  // <link href="...">  (rewrite all hrefs; the resolveUrl call
  // returns null for protocol-only hrefs so things like rel="next"
  // alternate links pass through unchanged).
  html = html.replace(
    /<link\b([^>]*?)\bhref\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, href) => {
      const next = rewriteUrl(href, pageUrl, assets, counters);
      return `<link${before}href=${q}${next}${q}`;
    },
  );

  // <script src="...">
  html = html.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, src) => {
      const next = rewriteUrl(src, pageUrl, assets, counters);
      return `<script${before}src=${q}${next}${q}`;
    },
  );

  // <img src/srcset/data-src/data-srcset/nitro-lazy-src/...>
  // Two responsibilities:
  //   1. Rewrite every URL-bearing attribute to point at Storage.
  //   2. If the tag is a NitroPack-style lazy image (src is a data-URI
  //      placeholder + nitro-lazy-src holds the real URL), promote
  //      nitro-lazy-src → src so the browser loads the image without
  //      having to execute NitroPack's JS swapper. Same for srcset.
  const IMG_URL_ATTRS = [
    "src",
    "data-src",
    "nitro-lazy-src",
    "data-lazy-src",
    "data-original",
    "data-orig-file",
  ];
  const IMG_SRCSET_ATTRS = [
    "srcset",
    "data-srcset",
    "nitro-lazy-srcset",
    "data-lazy-srcset",
  ];
  html = html.replace(/<img\b([^>]*)>/gi, (match, rawAttrs) => {
    let next = rawAttrs as string;

    for (const attr of IMG_URL_ATTRS) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*(["'])([^"']*)\\1`, "gi");
      next = next.replace(
        re,
        (m, q, v) =>
          `${attr}=${q}${rewriteUrl(v, pageUrl, assets, counters)}${q}`,
      );
    }
    for (const attr of IMG_SRCSET_ATTRS) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*(["'])([^"']*)\\1`, "gi");
      next = next.replace(
        re,
        (m, q, v) =>
          `${attr}=${q}${rewriteSrcset(v, pageUrl, assets, counters)}${q}`,
      );
    }

    // NitroPack swap: if a real lazy URL exists, force it into src/srcset
    // so browser loads it without depending on the lazy-loader JS firing.
    const lazySrc = next.match(
      /\b(?:nitro-lazy-src|data-lazy-src|data-original|data-orig-file)\s*=\s*(["'])([^"']+)\1/i,
    )?.[2];
    const lazySrcset = next.match(
      /\b(?:nitro-lazy-srcset|data-lazy-srcset)\s*=\s*(["'])([^"']+)\1/i,
    )?.[2];
    const srcVal = next.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i)?.[2];
    const isPlaceholder = !!srcVal && srcVal.startsWith("data:");
    if (lazySrc && (!srcVal || isPlaceholder)) {
      if (srcVal !== undefined) {
        next = next.replace(
          /\bsrc\s*=\s*(["'])[^"']*\1/i,
          (m, q) => `src=${q}${lazySrc}${q}`,
        );
      } else {
        next = `${next.trimEnd()} src="${lazySrc}"`;
      }
    }
    if (lazySrcset) {
      const hadSrcset = /\bsrcset\s*=/i.test(next);
      if (hadSrcset) {
        next = next.replace(
          /\bsrcset\s*=\s*(["'])[^"']*\1/i,
          (m, q) => `srcset=${q}${lazySrcset}${q}`,
        );
      } else {
        next = `${next.trimEnd()} srcset="${lazySrcset}"`;
      }
    }

    return `<img${next}>`;
  });

  // <source src=, srcset=>
  html = html.replace(/<source\b([^>]*)>/gi, (match, attrs) => {
    let next = attrs as string;
    next = next.replace(
      /\bsrc\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `src=${q}${rewriteUrl(v, pageUrl, assets, counters)}${q}`,
    );
    next = next.replace(
      /\bsrcset\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) =>
        `srcset=${q}${rewriteSrcset(v, pageUrl, assets, counters)}${q}`,
    );
    return `<source${next}>`;
  });

  // <video src=, poster=>
  html = html.replace(/<video\b([^>]*)>/gi, (match, attrs) => {
    let next = attrs as string;
    next = next.replace(
      /\bsrc\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `src=${q}${rewriteUrl(v, pageUrl, assets, counters)}${q}`,
    );
    next = next.replace(
      /\bposter\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) =>
        `poster=${q}${rewriteUrl(v, pageUrl, assets, counters)}${q}`,
    );
    return `<video${next}>`;
  });

  // <audio src=>
  html = html.replace(
    /<audio\b([^>]*?)\bsrc\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, src) => {
      const next = rewriteUrl(src, pageUrl, assets, counters);
      return `<audio${before}src=${q}${next}${q}`;
    },
  );

  // url(...) anywhere — inline <style>, style="" attrs, etc.
  // Preserves the original quoting style if any.
  html = html.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (match, q, raw) => {
      const next = rewriteUrl(raw, pageUrl, assets, counters);
      return `url(${q}${next}${q})`;
    },
  );

  return { html, rewritten: counters.rewritten, unmatched: counters.unmatched };
}

// ---------------------------------------------------------------
async function loadPages(): Promise<PageRow[]> {
  const c = sb();
  const rows: PageRow[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await c
      .from("url_inventory")
      .select("id, url")
      .eq("source_site", "v2")
      .eq("url_kind", "content")
      .neq("post_type", "attachment")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as PageRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// ---------------------------------------------------------------
async function processPage(
  client: ReturnType<typeof sb>,
  row: PageRow,
  assets: AssetMap,
): Promise<RewriteResult> {
  const htmlPath = resolve(HTML_DIR, `${row.id}.html`);
  if (!existsSync(htmlPath)) {
    return { id: row.id, url: row.url, status: "no-html" };
  }
  const raw = await readFile(htmlPath, "utf8");
  const { html, rewritten, unmatched } = rewriteHtml(raw, row.url, assets);

  // Upsert into content_items. The PK is url_inventory_id so a
  // simple upsert handles both "first time freezing" and "re-freeze
  // after a re-snapshot" cleanly.
  const { error } = await client.from("content_items").upsert(
    {
      url_inventory_id: row.id,
      frozen_html: html,
      frozen_at: new Date().toISOString(),
    },
    { onConflict: "url_inventory_id" },
  );
  if (error) {
    return {
      id: row.id,
      url: row.url,
      status: "db-error",
      error: error.message,
    };
  }
  return {
    id: row.id,
    url: row.url,
    status: "ok",
    rewritten_count: rewritten,
    unmatched_count: unmatched,
    bytes_in: raw.length,
    bytes_out: html.length,
  };
}

async function runConcurrent(
  client: ReturnType<typeof sb>,
  rows: PageRow[],
  assets: AssetMap,
): Promise<RewriteResult[]> {
  const results: RewriteResult[] = [];
  let i = 0;
  let done = 0;
  const total = rows.length;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= rows.length) return;
      const row = rows[idx];
      const r = await processPage(client, row, assets);
      results.push(r);
      done++;
      const tag =
        r.status === "ok" ? "✓" : r.status === "no-html" ? "·" : "✗";
      const detail =
        r.status === "ok"
          ? `${r.rewritten_count} rewritten, ${r.unmatched_count} skipped`
          : r.status === "no-html"
            ? "no snapshot HTML on disk"
            : (r.error ?? "unknown");
      console.log(
        `  ${tag} [${String(done).padStart(4)}/${total}] ${r.url}  ${detail}`,
      );
    }
  }

  await Promise.all(
    Array.from({ length: DB_CONCURRENCY }, () => worker()),
  );
  return results;
}

// ---------------------------------------------------------------
async function main() {
  console.log("Snapshot Phase C — HTML rewrite + persist");

  const manifestPath = resolve(OUT_DIR, "asset-storage.json");
  if (!existsSync(manifestPath)) {
    console.error(
      "asset-storage.json not found — run snapshot:download (Phase B) first",
    );
    process.exit(1);
  }
  const records = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as Record<string, StorageRecord>;
  const assets = loadAssetMap(records);
  console.log(`→ asset map: ${assets.size} URLs → Storage paths`);

  const rows = await loadPages();
  console.log(`→ pages to rewrite: ${rows.length}`);

  const client = sb();
  const t0 = Date.now();
  const results = await runConcurrent(client, rows, assets);
  const elapsed = Math.round((Date.now() - t0) / 1000);

  const ok = results.filter((r) => r.status === "ok");
  const noHtml = results.filter((r) => r.status === "no-html").length;
  const dbErr = results.filter((r) => r.status === "db-error");

  const totalRewritten = ok.reduce(
    (a, r) => a + (r.rewritten_count ?? 0),
    0,
  );
  const totalUnmatched = ok.reduce(
    (a, r) => a + (r.unmatched_count ?? 0),
    0,
  );
  const totalBytesIn = ok.reduce((a, r) => a + (r.bytes_in ?? 0), 0);
  const totalBytesOut = ok.reduce((a, r) => a + (r.bytes_out ?? 0), 0);

  console.log(
    `\n→ done in ${elapsed}s — ${ok.length} frozen, ${noHtml} skipped (no Phase A html), ${dbErr.length} DB errors`,
  );
  console.log(
    `→ ${totalRewritten} URL refs rewritten, ${totalUnmatched} skipped (not in asset manifest)`,
  );
  console.log(
    `→ HTML bytes: in ${(totalBytesIn / 1024 / 1024).toFixed(1)} MB → out ${(totalBytesOut / 1024 / 1024).toFixed(1)} MB`,
  );
  if (dbErr.length > 0) {
    console.log("\nDB errors:");
    for (const e of dbErr.slice(0, 10)) console.log(`  ${e.url}  ${e.error}`);
  }

  await writeFile(
    REWRITE_REPORT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        rows: rows.length,
        ok: ok.length,
        no_html: noHtml,
        db_errors: dbErr.length,
        total_url_refs_rewritten: totalRewritten,
        total_url_refs_unmatched: totalUnmatched,
        total_bytes_in: totalBytesIn,
        total_bytes_out: totalBytesOut,
        elapsed_seconds: elapsed,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nReport: ${REWRITE_REPORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
