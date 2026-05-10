/**
 * Snapshot Phase A — Discovery.
 *
 * Walks every publishable v2 URL, fetches the full HTML, and records
 * every CSS / JS / font / image / media URL referenced from that
 * HTML. Outputs a per-page asset list, a deduplicated site-wide
 * inventory, and the raw HTML files (which Phase C will rewrite and
 * persist to the database).
 *
 * Read-only against staging WordPress. Resumable: any page whose
 * HTML file already exists on disk is skipped, so re-running picks
 * up where it left off (or where a fetch failed).
 *
 * Run: npm run snapshot:discover
 *
 * Output (under migration/snapshot/):
 *   html/{id}.html              — raw HTML for the page
 *   page-assets/{id}.json       — { url, page_url, assets: [...] }
 *   manifest.json               — per-page status / size / asset count
 *   inventory.json              — deduped { url, content_type_hint,
 *                                  internal, ref_count, sample_pages }
 */

import { mkdir, readdir, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { sb } from "../extractor/lib";

// Same v2 staging host that all the other extractor scripts hit.
const SOURCE_SITE = "v2";
const BASE_URL = "https://anamayastg.wpenginepowered.com";

const OUT_DIR = resolve(process.cwd(), "migration/snapshot");
const HTML_DIR = resolve(OUT_DIR, "html");
const PAGE_ASSETS_DIR = resolve(OUT_DIR, "page-assets");

// Polite to a single WP host. Bump cautiously.
const CONCURRENCY = 5;
const TIMEOUT_MS = 30_000;

type PageRow = {
  id: string;
  url: string;
  url_path: string;
  post_type: string | null;
  wp_status: string | null;
};

type PageResult = {
  id: string;
  url: string;
  status: "ok" | "error" | "skipped-existing";
  http_status?: number;
  html_bytes?: number;
  asset_count?: number;
  error?: string;
};

type Asset = {
  url: string;
  // Where in the HTML the URL was found — used in Phase B to decide
  // whether the asset is critical (stylesheet, script) vs. nice-to-
  // have (preload, icon) and to set storage cache headers.
  source: AssetSource;
};

type AssetSource =
  | "stylesheet"
  | "script"
  | "image"
  | "image-srcset"
  | "video"
  | "video-poster"
  | "audio"
  | "font-preload"
  | "icon"
  | "inline-style-url";

// ---------------------------------------------------------------
// Page selection — the same filter we discussed: real content,
// published, not attachments. cp_recipe rows with null wp_status
// are included because the extractor missed setting the status,
// not because the user marked them draft.
// ---------------------------------------------------------------
async function loadPages(): Promise<PageRow[]> {
  const c = sb();
  const rows: PageRow[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await c
      .from("url_inventory")
      .select("id, url, url_path, post_type, wp_status")
      .eq("source_site", SOURCE_SITE)
      .eq("url_kind", "content")
      .neq("post_type", "attachment")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as PageRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  // Mirror the dashboard count: keep wp_status='publish' AND the
  // null-status recipes (treated as live per user confirmation).
  return rows.filter(
    (r) =>
      r.wp_status === "publish" ||
      (r.post_type === "cp_recipe" && r.wp_status == null),
  );
}

// ---------------------------------------------------------------
// Fetch with timeout. fetch() in Node 22 uses undici under the
// hood; AbortSignal.timeout works.
// ---------------------------------------------------------------
async function fetchHtml(
  url: string,
): Promise<{ ok: boolean; status: number; html?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "user-agent":
          "anamaya-snapshot/1.0 (+https://anamaya.com migration tool)",
      },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const html = await res.text();
    return { ok: true, status: res.status, html };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------
// Asset extraction. Regex-based on purpose: we don't need a real
// parser for Phase A — we just need every `href`/`src`/`url(...)`
// the page references. Phase B follows up by parsing each CSS file
// it downloads and recursively pulling in nested url(...) refs.
// ---------------------------------------------------------------

function pushUnique(map: Map<string, Asset>, asset: Asset) {
  // Inventory dedup is by URL alone; source is informational.
  if (!map.has(asset.url)) map.set(asset.url, asset);
}

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

function parseSrcset(srcset: string): string[] {
  // "img-1x.jpg 1x, img-2x.jpg 2x" or with widths "...600w, ...1200w"
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractAssets(html: string, pageUrl: string): Asset[] {
  const assets = new Map<string, Asset>();

  // <link rel="stylesheet" href="...">
  // <link rel="preload" as="font" href="...">
  // <link rel="icon" href="...">
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1];
    const rel = (attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "")
      .toLowerCase()
      .trim();
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = resolveUrl(href, pageUrl);
    if (!url) continue;
    let source: AssetSource = "stylesheet";
    if (rel.includes("stylesheet")) source = "stylesheet";
    else if (rel.includes("preload")) source = "font-preload";
    else if (rel.includes("icon")) source = "icon";
    else continue; // skip canonical, alternate, dns-prefetch, etc.
    pushUnique(assets, { url, source });
  }

  // <script src="...">
  for (const m of html.matchAll(/<script\b([^>]*?)src\s*=\s*["']([^"']+)["']/gi)) {
    const url = resolveUrl(m[2], pageUrl);
    if (url) pushUnique(assets, { url, source: "script" });
  }

  // <img src="..." srcset="...">
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = resolveUrl(src, pageUrl);
      if (url) pushUnique(assets, { url, source: "image" });
    }
    const srcset = attrs.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const s of parseSrcset(srcset)) {
        const url = resolveUrl(s, pageUrl);
        if (url) pushUnique(assets, { url, source: "image-srcset" });
      }
    }
    const dataSrc = attrs.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (dataSrc) {
      const url = resolveUrl(dataSrc, pageUrl);
      if (url) pushUnique(assets, { url, source: "image" });
    }
    const dataSrcset = attrs.match(/\bdata-srcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (dataSrcset) {
      for (const s of parseSrcset(dataSrcset)) {
        const url = resolveUrl(s, pageUrl);
        if (url) pushUnique(assets, { url, source: "image-srcset" });
      }
    }
  }

  // <source src="..." srcset="..."> inside <picture>/<video>/<audio>
  for (const m of html.matchAll(/<source\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = resolveUrl(src, pageUrl);
      if (url) pushUnique(assets, { url, source: "video" });
    }
    const srcset = attrs.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const s of parseSrcset(srcset)) {
        const url = resolveUrl(s, pageUrl);
        if (url) pushUnique(assets, { url, source: "image-srcset" });
      }
    }
  }

  // <video src="..." poster="...">
  for (const m of html.matchAll(/<video\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = resolveUrl(src, pageUrl);
      if (url) pushUnique(assets, { url, source: "video" });
    }
    const poster = attrs.match(/\bposter\s*=\s*["']([^"']+)["']/i)?.[1];
    if (poster) {
      const url = resolveUrl(poster, pageUrl);
      if (url) pushUnique(assets, { url, source: "video-poster" });
    }
  }

  // <audio src="...">
  for (const m of html.matchAll(/<audio\b([^>]*?)src\s*=\s*["']([^"']+)["']/gi)) {
    const url = resolveUrl(m[2], pageUrl);
    if (url) pushUnique(assets, { url, source: "audio" });
  }

  // url(...) inside any context — inline <style>, style="" attributes,
  // and the page's inline CSS. Phase B will recurse into each
  // downloaded stylesheet for nested url() references.
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const url = resolveUrl(m[1], pageUrl);
    if (url) pushUnique(assets, { url, source: "inline-style-url" });
  }

  return Array.from(assets.values());
}

// ---------------------------------------------------------------
// Concurrency-limited driver.
// ---------------------------------------------------------------
async function processPage(row: PageRow): Promise<PageResult> {
  const htmlPath = resolve(HTML_DIR, `${row.id}.html`);
  const assetsPath = resolve(PAGE_ASSETS_DIR, `${row.id}.json`);

  if (existsSync(htmlPath) && existsSync(assetsPath)) {
    // Resumable: trust prior fetch.
    const st = await stat(htmlPath);
    return {
      id: row.id,
      url: row.url,
      status: "skipped-existing",
      html_bytes: st.size,
    };
  }

  const res = await fetchHtml(row.url);
  if (!res.ok || !res.html) {
    return {
      id: row.id,
      url: row.url,
      status: "error",
      http_status: res.status,
      error: res.error ?? `HTTP ${res.status}`,
    };
  }

  const assets = extractAssets(res.html, row.url);
  await writeFile(htmlPath, res.html, "utf8");
  await writeFile(
    assetsPath,
    JSON.stringify(
      { id: row.id, url: row.url, url_path: row.url_path, assets },
      null,
      2,
    ),
    "utf8",
  );

  return {
    id: row.id,
    url: row.url,
    status: "ok",
    http_status: res.status,
    html_bytes: res.html.length,
    asset_count: assets.length,
  };
}

async function runConcurrent(
  rows: PageRow[],
  worker: (r: PageRow) => Promise<PageResult>,
  concurrency: number,
): Promise<PageResult[]> {
  const results: PageResult[] = [];
  let i = 0;
  let done = 0;
  const total = rows.length;

  async function next(): Promise<void> {
    while (true) {
      const myIndex = i++;
      if (myIndex >= rows.length) return;
      const row = rows[myIndex];
      const r = await worker(row);
      results.push(r);
      done++;
      const tag =
        r.status === "ok"
          ? "✓"
          : r.status === "skipped-existing"
            ? "·"
            : "✗";
      const detail =
        r.status === "ok"
          ? `${r.html_bytes}b · ${r.asset_count} assets`
          : r.status === "skipped-existing"
            ? "cached"
            : `${r.error ?? r.http_status}`;
      console.log(
        `  ${tag} [${String(done).padStart(4)}/${total}] ${r.url}  ${detail}`,
      );
    }
  }

  const workers = Array.from({ length: concurrency }, () => next());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------
// Aggregate per-page asset lists into a deduped site-wide inventory.
// ---------------------------------------------------------------
async function aggregateInventory(): Promise<{
  totalUnique: number;
  internalCount: number;
  externalCount: number;
}> {
  const baseHost = new URL(BASE_URL).host;
  const inventory = new Map<
    string,
    {
      url: string;
      sources: Set<AssetSource>;
      ref_count: number;
      internal: boolean;
      sample_pages: string[];
    }
  >();

  const files = await readdir(PAGE_ASSETS_DIR);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await import("fs/promises").then((fs) =>
      fs.readFile(resolve(PAGE_ASSETS_DIR, f), "utf8"),
    );
    const data = JSON.parse(raw) as {
      url: string;
      url_path: string;
      assets: Asset[];
    };
    for (const a of data.assets) {
      let entry = inventory.get(a.url);
      if (!entry) {
        let internal = false;
        try {
          internal = new URL(a.url).host === baseHost;
        } catch {
          /* leave false */
        }
        entry = {
          url: a.url,
          sources: new Set(),
          ref_count: 0,
          internal,
          sample_pages: [],
        };
        inventory.set(a.url, entry);
      }
      entry.sources.add(a.source);
      entry.ref_count++;
      if (entry.sample_pages.length < 3) entry.sample_pages.push(data.url_path);
    }
  }

  const arr = Array.from(inventory.values()).map((e) => ({
    url: e.url,
    sources: Array.from(e.sources),
    ref_count: e.ref_count,
    internal: e.internal,
    sample_pages: e.sample_pages,
  }));
  // Sort by ref_count desc — most-shared assets at the top.
  arr.sort((a, b) => b.ref_count - a.ref_count);

  await writeFile(
    resolve(OUT_DIR, "inventory.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_site: SOURCE_SITE,
        base_url: BASE_URL,
        total_unique_assets: arr.length,
        internal_count: arr.filter((a) => a.internal).length,
        external_count: arr.filter((a) => !a.internal).length,
        assets: arr,
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    totalUnique: arr.length,
    internalCount: arr.filter((a) => a.internal).length,
    externalCount: arr.filter((a) => !a.internal).length,
  };
}

// ---------------------------------------------------------------
async function main() {
  console.log("Snapshot Phase A — Discovery");
  console.log(`Source: ${BASE_URL}`);
  await mkdir(HTML_DIR, { recursive: true });
  await mkdir(PAGE_ASSETS_DIR, { recursive: true });

  console.log("→ loading publishable URL list");
  const rows = await loadPages();
  console.log(`  ${rows.length} pages to process`);
  if (rows.length === 0) {
    console.log("nothing to do");
    return;
  }

  console.log(`→ fetching (concurrency=${CONCURRENCY})`);
  const t0 = Date.now();
  const results = await runConcurrent(rows, processPage, CONCURRENCY);
  const elapsed = Math.round((Date.now() - t0) / 1000);

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped-existing").length;
  const errors = results.filter((r) => r.status === "error");
  console.log(
    `\n→ fetch complete in ${elapsed}s — ${ok} new, ${skipped} cached, ${errors.length} errors`,
  );

  await writeFile(
    resolve(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_site: SOURCE_SITE,
        base_url: BASE_URL,
        total: results.length,
        ok,
        skipped,
        errors: errors.length,
        elapsed_seconds: elapsed,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (errors.length > 0) {
    console.log("\nErrors (first 10):");
    for (const e of errors.slice(0, 10)) {
      console.log(`  ${e.url}  ${e.error ?? e.http_status}`);
    }
    console.log(`  see manifest.json for the full list`);
  }

  console.log("\n→ aggregating site-wide asset inventory");
  const inv = await aggregateInventory();
  console.log(
    `  ${inv.totalUnique} unique assets · ${inv.internalCount} internal · ${inv.externalCount} external`,
  );
  console.log(`\nDone. Output in ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
