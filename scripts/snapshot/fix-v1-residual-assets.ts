/**
 * Fix v1 residual assets — mop up the handful of images that capture-v1
 * left pointing at anamaya.com.
 *
 * A few images are referenced in ways the Phase-A-style extractor misses
 * (e.g. only inside an og:image <meta>, or odd lazy markup), so they were
 * never downloaded and stayed as live anamaya.com URLs — which would 404
 * the moment DNS cuts over. This pass:
 *   1. collects remaining anamaya/anamayastg wp-content image URLs from
 *      the 79 v1 frozen_html bodies AND from v1 retreat seo_meta.og_image,
 *   2. downloads + uploads the reachable ones to the snapshot bucket,
 *   3. rewrites those URLs → Storage in frozen_html and og_image.
 *
 * Unreachable (404-on-source) URLs are reported and left alone — they're
 * already broken on production. Idempotent.
 *
 * Run: npm run snapshot:fix-v1-residual
 */

import { sb } from "../extractor/lib";
import { fetchBytes, publicStorageUrl, storagePathFor, uploadAsset } from "./snapshot-core";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const WP_IMG_RE =
  /https?:\/\/(?:www\.)?(?:anamaya\.com|anamayastg\.wpenginepowered\.com)\/wp-content\/[^"')\s]+/gi;

type FrozenJoin = { frozen_html: string } | { frozen_html: string }[] | null;
type FrozenRow = { id: string; url_path: string; post_type: string; content_items: FrozenJoin };

function frozenOf(ci: FrozenJoin): string | undefined {
  if (!ci) return undefined;
  return Array.isArray(ci) ? ci[0]?.frozen_html : ci.frozen_html;
}

async function main() {
  const c = sb();
  const { data: rows } = await c
    .from("url_inventory")
    .select("id, url_path, post_type, content_items!inner(frozen_html)")
    .eq("source_site", "v1")
    .not("content_items.frozen_html", "is", null);

  const frozenById = new Map<string, string>();
  const urls = new Set<string>();
  for (const r of (rows ?? []) as FrozenRow[]) {
    const html = frozenOf(r.content_items);
    if (!html) continue;
    frozenById.set(r.id, html);
    for (const m of html.matchAll(WP_IMG_RE)) urls.add(m[0]);
  }

  // v1 retreat og_images that are still raw wp-content URLs.
  const { data: retreatRows } = await c
    .from("url_inventory")
    .select("id")
    .eq("source_site", "v1")
    .eq("post_type", "retreat");
  const retreatIds = ((retreatRows ?? []) as { id: string }[]).map((r) => r.id);
  const ogById = new Map<string, string>();
  for (let i = 0; i < retreatIds.length; i += 200) {
    const { data: seo } = await c
      .from("seo_meta")
      .select("url_inventory_id, og_image")
      .in("url_inventory_id", retreatIds.slice(i, i + 200));
    for (const s of seo ?? []) {
      if (s.og_image && WP_IMG_RE.test(s.og_image)) {
        WP_IMG_RE.lastIndex = 0;
        ogById.set(s.url_inventory_id, s.og_image);
        urls.add(s.og_image);
      }
      WP_IMG_RE.lastIndex = 0;
    }
  }

  console.log(`→ ${urls.size} distinct residual wp-content URLs to resolve`);

  // Download + upload, building origURL → Storage URL map.
  const map = new Map<string, string>();
  let downloaded = 0;
  let dead = 0;
  for (const url of urls) {
    const fetched = await fetchBytes(url);
    if (!fetched.ok) {
      dead++;
      console.log(`  ✗ ${fetched.status} ${url.slice(0, 80)}`);
      continue;
    }
    const path = storagePathFor(url);
    const up = await uploadAsset(c, path, fetched.bytes, fetched.contentType);
    if (!up.ok) {
      console.log(`  ✗ upload ${url.slice(0, 70)} — ${up.error}`);
      continue;
    }
    map.set(url, publicStorageUrl(SUPABASE_URL, path));
    downloaded++;
  }
  console.log(`  ${downloaded} downloaded, ${dead} unreachable (left as-is)`);

  // Patch frozen_html (string replace each mapped URL).
  let patchedPages = 0;
  for (const [id, html] of frozenById) {
    let next = html;
    let changed = false;
    for (const [orig, store] of map) {
      if (next.includes(orig)) {
        next = next.split(orig).join(store);
        changed = true;
      }
    }
    if (changed) {
      const { error } = await c
        .from("content_items")
        .update({ frozen_html: next })
        .eq("url_inventory_id", id);
      if (!error) patchedPages++;
    }
  }
  console.log(`  patched ${patchedPages} frozen pages`);

  // Patch retreat og_image.
  let patchedOg = 0;
  for (const [id, og] of ogById) {
    const store = map.get(og);
    if (!store) continue;
    const { error } = await c.from("seo_meta").update({ og_image: store }).eq("url_inventory_id", id);
    if (!error) patchedOg++;
  }
  console.log(`  remapped ${patchedOg} retreat og_images to Storage`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
