/**
 * Cutover re-sync — one command to make the launch DB match live
 * anamaya.com immediately before flipping DNS. Sweeps every public WP
 * post type, and for each live URL:
 *   • MISSING from url_inventory      → add it (insert row, capture
 *                                       frozen_html; retreats also get
 *                                       scraped body + hero into the
 *                                       structured tables so they render
 *                                       natively)
 *   • present but live `modified` is
 *     newer than our capture (STALE)  → re-capture / re-scrape
 *   • up to date                      → skip
 *
 * DRY RUN BY DEFAULT — prints the plan and changes nothing. Re-run with
 * `--apply` to write. Idempotent; safe to run repeatedly.
 *
 *   npx tsx scripts/snapshot/cutover-resync.ts            # preview
 *   npx tsx scripts/snapshot/cutover-resync.ts --apply    # execute
 *
 * Reuses the live REST + snapshot-capture path proven by refresh-stale.ts
 * and add-missing.ts.
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { sb } from "../extractor/lib";
import {
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

const APPLY = process.argv.includes("--apply");
const V1 = (process.env.WP_SOURCE_URL_V1 ?? "https://anamaya.com").replace(/\/$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const MANIFEST_PATH = resolve(process.cwd(), "migration/snapshot-v1/asset-storage.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// rest_base → post_type stored in url_inventory + whether it renders
// natively (retreats) or as a snapshot (everything else).
const TYPES: { restBase: string; postType: string; native: boolean }[] = [
  { restBase: "pages", postType: "page", native: false },
  { restBase: "posts", postType: "post", native: false },
  { restBase: "retreat", postType: "retreat", native: true },
  { restBase: "ytt", postType: "ytt", native: false },
  { restBase: "accommodations", postType: "accommodations", native: false },
  { restBase: "guest_yoga_teacher", postType: "guest_yoga_teacher", native: false },
  { restBase: "news_coverage", postType: "news_coverage", native: false },
];

type Manifest = Record<string, { url: string; storage_path: string; content_type: string }>;
type LiveItem = { wpId: number; path: string; url: string; modified: string; title: string; datePub: string; featured: number; excerpt: string | null };

const pathOf = (link: string) => { try { return new URL(link).pathname; } catch { return link; } };
const norm = (p: string) => p.replace(/\/$/, "");

// Paths rendered by hardcoded React pages with NO snapshot/scraped data
// behind them (proxy.ts HARDCODED_PUBLIC). Re-capturing their frozen HTML
// is wasted work — it's never served. NB: /retreat/<slug> is NOT here —
// retreat detail pages DO render from scraped_body_html, so they're swept.
const SKIP_PATHS = new Set(["", "/home2", "/retreats"]);
const decode = (s: string | null): string | null =>
  s == null ? null : s.replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const metaContent = (html: string, key: string, attr: "property" | "name"): string | null => {
  const tag = html.match(new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${key}["'][^>]*>`, "i"))?.[0];
  return tag ? tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? null : null;
};
const pageTitle = (html: string): string | null => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;

const CONTAINER_START_RE = /<div\s+data-elementor-type="single(?:-post)?"[^>]*>/i;
function retreatBody(html: string): string | null {
  const m = html.match(CONTAINER_START_RE);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = html.indexOf(">", start) + 1;
  let mm: RegExpExecArray | null;
  let container: string | null = null;
  while ((mm = re.exec(html)) !== null) {
    depth += mm[1] === "/" ? -1 : 1;
    if (depth === 0) { container = html.slice(start, mm.index + mm[0].length); break; }
  }
  if (!container) return null;
  return container
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|template|noscript)\b[^>]*\/?>/gi, "")
    .replace(/\snitro-[a-z-]+="[^"]*"/gi, "").replace(/\sdata-nitro[a-z-]*="[^"]*"/gi, "")
    .replace(/\s+>/g, ">");
}

async function jget(url: string): Promise<any> {
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45_000) }).catch(() => null);
  return r && r.ok ? r.json() : null;
}
async function hget(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(45_000) }).catch(() => null);
  return r && r.ok ? r.text() : null;
}
async function bget(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(45_000) }).catch(() => null);
  if (!r || !r.ok) return null;
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? "application/octet-stream" };
}

async function liveItems(restBase: string): Promise<LiveItem[]> {
  const out: LiveItem[] = [];
  for (let page = 1; page <= 20; page++) {
    const arr = (await jget(`${V1}/wp-json/wp/v2/${restBase}?per_page=100&page=${page}&orderby=modified&order=desc&_fields=id,link,title,date_gmt,modified_gmt,featured_media,excerpt`)) as any[] | null;
    if (!arr || !arr.length) break;
    for (const x of arr) out.push({
      wpId: x.id, path: pathOf(x.link), url: x.link, modified: x.modified_gmt ? `${x.modified_gmt}Z` : "",
      title: decode(x.title?.rendered ?? "") ?? "", datePub: x.date_gmt ? `${x.date_gmt}Z` : "",
      featured: x.featured_media || 0,
      excerpt: x.excerpt?.rendered ? decode(x.excerpt.rendered.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : null,
    });
    if (arr.length < 100) break;
  }
  return out;
}

async function captureFrozen(c: ReturnType<typeof sb>, url: string, html: string, manifest: Manifest): Promise<{ frozen: string; ogStorage: string | null }> {
  for (const a of extractAssets(html, url)) {
    if (manifest[a.url] || isTracking(a.url)) continue;
    const got = await bget(a.url);
    if (!got) continue;
    const sp = storagePathFor(a.url);
    if ((await uploadAsset(c, sp, got.bytes, got.contentType)).ok) {
      manifest[a.url] = { url: a.url, storage_path: sp, content_type: got.contentType };
      if (got.contentType.includes("text/css") || urlExtension(a.url) === "css") {
        const css = new TextDecoder("utf-8").decode(got.bytes);
        for (const ref of extractCssRefs(css, a.url)) {
          if (manifest[ref] || isTracking(ref)) continue;
          const cg = await bget(ref);
          if (cg) { const csp = storagePathFor(ref); if ((await uploadAsset(c, csp, cg.bytes, cg.contentType)).ok) manifest[ref] = { url: ref, storage_path: csp, content_type: cg.contentType }; }
        }
      }
    }
  }
  let ogStorage: string | null = null;
  const ogOrig = metaContent(html, "og:image", "property");
  if (ogOrig) {
    if (!manifest[ogOrig]) { const got = await bget(ogOrig); if (got) { const sp = storagePathFor(ogOrig); if ((await uploadAsset(c, sp, got.bytes, got.contentType)).ok) manifest[ogOrig] = { url: ogOrig, storage_path: sp, content_type: got.contentType }; } }
    if (manifest[ogOrig]) ogStorage = publicStorageUrl(SUPABASE_URL, manifest[ogOrig].storage_path);
  }
  const assetMap: AssetMap = new Map();
  for (const r of Object.values(manifest)) assetMap.set(r.url, publicStorageUrl(SUPABASE_URL, r.storage_path));
  return { frozen: rewriteHtmlAssets(html, url, assetMap).html, ogStorage };
}

async function writeItem(c: ReturnType<typeof sb>, t: { postType: string; native: boolean }, live: LiveItem, invId: string, manifest: Manifest) {
  const html = await hget(live.url);
  if (!html) { console.log(`    ✗ fetch failed`); return; }
  const { frozen, ogStorage } = await captureFrozen(c, live.url, html, manifest);
  if (t.native) {
    const body = retreatBody(frozen);
    if (!body || body.length < 500) { console.log(`    ✗ no retreat body`); return; }
    const ogImage = ogStorage || body.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const metaDesc = decode(metaContent(html, "description", "name") || metaContent(html, "og:description", "property"));
    const title = decode(metaContent(html, "og:title", "property") || pageTitle(html) || live.title);
    await c.from("content_items").upsert({ url_inventory_id: invId, frozen_html: frozen, frozen_at: new Date().toISOString(), scraped_body_html: body, excerpt_rendered: metaDesc ?? live.excerpt ?? null, scraped_at: new Date().toISOString() }, { onConflict: "url_inventory_id" });
    await c.from("seo_meta").upsert({ url_inventory_id: invId, meta_title: title ?? null, meta_description: metaDesc ?? null, og_image: ogImage ?? null, canonical_url: live.url }, { onConflict: "url_inventory_id" });
    console.log(`    ✓ retreat body=${body.length}b hero=${ogImage ? "yes" : "NONE"}`);
  } else {
    await c.from("content_items").upsert({ url_inventory_id: invId, frozen_html: frozen, frozen_at: new Date().toISOString() }, { onConflict: "url_inventory_id" });
    console.log(`    ✓ snapshot frozen=${frozen.length}b`);
  }
}

async function main() {
  console.log(`Cutover re-sync ${APPLY ? "(APPLY — writing)" : "(dry run — no writes; pass --apply to execute)"}\n`);
  const c = sb();
  const manifest: Manifest = existsSync(MANIFEST_PATH) ? JSON.parse(await readFile(MANIFEST_PATH, "utf8")) : {};

  // Inventory indexed by normalized path. We track BOTH the v1 row (our
  // refresh/insert target) and the EFFECTIVE capture time = the snapshot
  // that actually serves: v1's capture if v1 was captured, else v2's
  // (serving prefers v1 by source_site, else falls back to the v2 May-9
  // capture). A page is only "stale" if production changed AFTER whatever
  // we'd serve — so a 2019 page still covered by the v2 capture is fresh.
  const inv = new Map<string, { v1Id: string | null; effCap: string | null }>();
  {
    const capOf = (r: any): string | null => {
      const ci = Array.isArray(r.content_items) ? r.content_items[0] : r.content_items;
      return [ci?.frozen_at ?? null, ci?.scraped_at ?? null].filter(Boolean).sort().pop() ?? null;
    };
    for (const site of ["v1", "v2"] as const) {
      let from = 0;
      while (true) {
        const { data } = await c.from("url_inventory").select("id, url_path, content_items(frozen_at, scraped_at)").eq("source_site", site).range(from, from + 999);
        if (!data?.length) break;
        for (const r of data as any[]) {
          const key = norm(r.url_path);
          const cap = capOf(r);
          const cur = inv.get(key) ?? { v1Id: null, effCap: null };
          if (site === "v1") { cur.v1Id = r.id; if (cap) cur.effCap = cap; }       // v1 capture wins as effective
          else if (cur.effCap == null && cap) cur.effCap = cap;                      // else fall back to v2
          inv.set(key, cur);
        }
        if (data.length < 1000) break;
        from += 1000;
      }
    }
  }

  let added = 0, refreshed = 0, fresh = 0;
  const plan: string[] = [];

  for (const t of TYPES) {
    const items = await liveItems(t.restBase);
    for (const live of items) {
      const key = norm(live.path);
      if (SKIP_PATHS.has(key)) { fresh++; continue; }
      const row = inv.get(key);
      const needsAdd = !row || (!row.v1Id && row.effCap == null);
      const stale = !!row && row.v1Id != null && !!live.modified && (row.effCap == null || new Date(live.modified) > new Date(row.effCap));

      if (needsAdd) {
        // genuinely missing, OR a v2-only row with no usable capture → create v1
        plan.push(`ADD      [${t.postType}] ${live.path}`);
        if (APPLY) {
          console.log(`ADD [${t.postType}] ${live.path}`);
          const { data: up, error } = await c.from("url_inventory").upsert({
            url: live.url, url_path: live.path, url_kind: "content", post_type: t.postType, source_site: "v1",
            title: live.title, wp_id: live.wpId, date_published: live.datePub || null, date_modified: live.modified || null,
            featured_media_wp_id: live.featured || null, excerpt: live.excerpt, status: "discovered",
          }, { onConflict: "source_site,url" }).select("id").single();
          if (error || !up) { console.log(`    ✗ inventory: ${error?.message}`); continue; }
          await writeItem(c, t, live, up.id, manifest);
        }
        added++;
      } else if (stale) {
        const cap = row!.effCap;
        plan.push(`REFRESH  [${t.postType}] ${live.path}  (live ${live.modified.slice(0, 10)} > served ${cap ? cap.slice(0, 10) : "none"})`);
        if (APPLY) {
          console.log(`REFRESH [${t.postType}] ${live.path}`);
          let targetId = row!.v1Id!;
          // keep date_modified current so newest-wins ordering stays right
          await c.from("url_inventory").update({ date_modified: live.modified, featured_media_wp_id: live.featured || null }).eq("id", targetId);
          await writeItem(c, t, live, targetId, manifest);
        }
        refreshed++;
      } else {
        fresh++;
      }
    }
  }

  if (APPLY) await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\n${"=".repeat(60)}`);
  if (!APPLY && plan.length) {
    console.log("PLANNED CHANGES:");
    for (const p of plan) console.log("  " + p);
    console.log("");
  }
  console.log(`add=${added}  refresh=${refreshed}  fresh=${fresh}  ${APPLY ? "(written)" : "(dry run — re-run with --apply to write)"}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
