/**
 * Add the handful of live anamaya.com URLs that were created AFTER the
 * April discovery and so never made it into url_inventory. Without this
 * they'd 404 (post) or be absent from /retreats (retreats) on launch.
 *
 * For each target it: inserts the v1 url_inventory row from the WP REST
 * record, captures frozen_html (assets → Supabase Storage, URLs rewritten),
 * and — for retreats, which render natively from the structured tables —
 * extracts the Elementor body + hero image into content_items / seo_meta
 * exactly like populate-v1-retreats.ts.
 *
 * Idempotent (upserts). Run: npx tsx scripts/snapshot/add-missing.ts
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

const V1 = (process.env.WP_SOURCE_URL_V1 ?? "https://anamaya.com").replace(/\/$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const MANIFEST_PATH = resolve(process.cwd(), "migration/snapshot-v1/asset-storage.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Target = { path: string; slug: string; restBase: string; postType: string };
const TARGETS: Target[] = [
  { path: "/retreat/mermaid-retreat-costa-rica/", slug: "mermaid-retreat-costa-rica", restBase: "retreat", postType: "retreat" },
  { path: "/retreat/new-years-retreat-in-costa-rica-mari-patuzzo/", slug: "new-years-retreat-in-costa-rica-mari-patuzzo", restBase: "retreat", postType: "retreat" },
  { path: "/retreat/frequency-specific-microcurrent-training-carolyn-mcmakin-2026/", slug: "frequency-specific-microcurrent-training-carolyn-mcmakin-2026", restBase: "retreat", postType: "retreat" },
  { path: "/still-and-strong-retreat-costa-rica-july-2026/", slug: "still-and-strong-retreat-costa-rica-july-2026", restBase: "posts", postType: "post" },
];

type Manifest = Record<string, { url: string; storage_path: string; content_type: string }>;

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45_000) }).catch(() => null);
  if (!r || !r.ok) return null;
  return r.json();
}
async function fetchHtml(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(45_000) }).catch(() => null);
  if (!r || !r.ok) { console.log(`  ✗ html ${url} → ${r ? r.status : "net"}`); return null; }
  return r.text();
}
async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(45_000) }).catch(() => null);
  if (!r || !r.ok) return null;
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") ?? "application/octet-stream" };
}

const decode = (s: string | null): string | null =>
  s == null ? null : s
    .replace(/&amp;/g, "&").replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”").replace(/&#8230;/g, "…").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const metaContent = (html: string, key: string, attr: "property" | "name"): string | null => {
  const tag = html.match(new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${key}["'][^>]*>`, "i"))?.[0];
  return tag ? tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? null : null;
};
const pageTitle = (html: string): string | null =>
  html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;

const CONTAINER_START_RE = /<div\s+data-elementor-type="single(?:-post)?"[^>]*>/i;
function stripHeadAndShell(html: string): string | null {
  const m = html.match(CONTAINER_START_RE);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = html.indexOf(">", start) + 1;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(html)) !== null) {
    depth += mm[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, mm.index + mm[0].length);
  }
  return null;
}
function cleanHtml(html: string): string {
  return html
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|template|noscript)\b[^>]*\/?>/gi, "")
    .replace(/\snitro-[a-z-]+="[^"]*"/gi, "")
    .replace(/\sdata-nitro[a-z-]*="[^"]*"/gi, "")
    .replace(/\s+>/g, ">");
}

async function captureFrozen(
  c: ReturnType<typeof sb>,
  url: string,
  html: string,
  manifest: Manifest,
): Promise<{ frozen: string; ogStorage: string | null }> {
  // download any new assets
  for (const a of extractAssets(html, url)) {
    if (manifest[a.url] || isTracking(a.url)) continue;
    const got = await fetchBytes(a.url);
    if (!got) continue;
    const sp = storagePathFor(a.url);
    if ((await uploadAsset(c, sp, got.bytes, got.contentType)).ok) {
      manifest[a.url] = { url: a.url, storage_path: sp, content_type: got.contentType };
      if (got.contentType.includes("text/css") || urlExtension(a.url) === "css") {
        const css = new TextDecoder("utf-8").decode(got.bytes);
        for (const ref of extractCssRefs(css, a.url)) {
          if (manifest[ref] || isTracking(ref)) continue;
          const cg = await fetchBytes(ref);
          if (cg) {
            const csp = storagePathFor(ref);
            if ((await uploadAsset(c, csp, cg.bytes, cg.contentType)).ok)
              manifest[ref] = { url: ref, storage_path: csp, content_type: cg.contentType };
          }
        }
      }
    }
  }
  // og:image — download explicitly so the retreat hero resolves to Storage
  let ogStorage: string | null = null;
  const ogOrig = metaContent(html, "og:image", "property");
  if (ogOrig) {
    if (!manifest[ogOrig]) {
      const got = await fetchBytes(ogOrig);
      if (got) {
        const sp = storagePathFor(ogOrig);
        if ((await uploadAsset(c, sp, got.bytes, got.contentType)).ok)
          manifest[ogOrig] = { url: ogOrig, storage_path: sp, content_type: got.contentType };
      }
    }
    if (manifest[ogOrig]) ogStorage = publicStorageUrl(SUPABASE_URL, manifest[ogOrig].storage_path);
  }
  const assetMap: AssetMap = new Map();
  for (const r of Object.values(manifest)) assetMap.set(r.url, publicStorageUrl(SUPABASE_URL, r.storage_path));
  const { html: frozen } = rewriteHtmlAssets(html, url, assetMap);
  return { frozen, ogStorage };
}

async function main() {
  const c = sb();
  const manifest: Manifest = existsSync(MANIFEST_PATH) ? JSON.parse(await readFile(MANIFEST_PATH, "utf8")) : {};

  for (const t of TARGETS) {
    console.log(`\n→ ${t.postType}: ${t.path}`);
    const rec = (await fetchJson(
      `${V1}/wp-json/wp/v2/${t.restBase}?slug=${t.slug}&_fields=id,link,title,date_gmt,modified_gmt,featured_media,excerpt,status`,
    )) as Array<{ id: number; link: string; title: { rendered: string }; date_gmt: string; modified_gmt: string; featured_media: number; excerpt?: { rendered: string }; status: string }> | null;
    if (!rec || !rec.length) { console.log("  ✗ no REST record"); continue; }
    const p = rec[0];
    const url = `${V1}${t.path}`;
    const excerptText = p.excerpt?.rendered ? decode(p.excerpt.rendered.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : null;

    const invRow = {
      url,
      url_path: t.path,
      url_kind: "content",
      post_type: t.postType,
      source_site: "v1",
      title: decode(p.title.rendered),
      wp_id: p.id,
      date_published: p.date_gmt ? `${p.date_gmt}Z` : null,
      date_modified: p.modified_gmt ? `${p.modified_gmt}Z` : null,
      featured_media_wp_id: p.featured_media || null,
      excerpt: excerptText,
      status: "discovered",
    };
    const { data: up, error: invErr } = await c
      .from("url_inventory")
      .upsert(invRow, { onConflict: "source_site,url" })
      .select("id")
      .single();
    if (invErr || !up) { console.log(`  ✗ url_inventory: ${invErr?.message}`); continue; }
    const invId = up.id as string;

    const html = await fetchHtml(url);
    if (!html) continue;
    const { frozen, ogStorage } = await captureFrozen(c, url, html, manifest);

    if (t.postType === "retreat") {
      const container = stripHeadAndShell(frozen);
      const body = container && container.length > 500 ? cleanHtml(container) : null;
      if (!body) { console.log("  ✗ could not isolate retreat body"); continue; }
      const ogImage = ogStorage || body.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || null;
      const metaDesc = decode(metaContent(html, "description", "name") || metaContent(html, "og:description", "property"));
      const title = decode(metaContent(html, "og:title", "property") || pageTitle(html) || (invRow.title ?? ""));
      const { error: ciErr } = await c.from("content_items").upsert(
        { url_inventory_id: invId, frozen_html: frozen, frozen_at: new Date().toISOString(), scraped_body_html: body, excerpt_rendered: metaDesc ?? excerptText ?? null, scraped_at: new Date().toISOString() },
        { onConflict: "url_inventory_id" },
      );
      const { error: seoErr } = await c.from("seo_meta").upsert(
        { url_inventory_id: invId, meta_title: title ?? null, meta_description: metaDesc ?? null, og_image: ogImage ?? null, canonical_url: url },
        { onConflict: "url_inventory_id" },
      );
      console.log(`  ${ciErr || seoErr ? "✗ " + (ciErr?.message ?? "") + (seoErr?.message ?? "") : "✓ retreat"} body=${body.length}b hero=${ogImage ? "yes" : "NONE"}`);
    } else {
      const { error: ciErr } = await c.from("content_items").upsert(
        { url_inventory_id: invId, frozen_html: frozen, frozen_at: new Date().toISOString() },
        { onConflict: "url_inventory_id" },
      );
      console.log(`  ${ciErr ? "✗ " + ciErr.message : "✓ post (snapshot)"} frozen=${frozen.length}b`);
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nDone. Manifest holds ${Object.keys(manifest).length} assets.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
