import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeEntities } from "./decode";

/** Read a named attribute from a single `<img ...>` tag string. */
function attr(tag: string, name: string): string | null {
  const dq = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (dq) return dq[1];
  const sq = tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  return sq ? sq[1] : null;
}

/**
 * Return the URL of the first real image embedded in a post's body HTML,
 * or null. Used as a fallback thumbnail when a post has no featured image
 * set (so a photo-rich article never shows an empty coloured tile).
 *
 * Robust to WordPress lazy-loading: prefers a real lazy source
 * (`data-src` / `data-lazy-src`) over a placeholder `src`, then falls back
 * to the first `srcset` entry. Skips inline `data:` URIs (1px spacers /
 * base64 placeholders).
 */
export function firstBodyImage(html: string | null | undefined): string | null {
  if (!html) return null;
  const tags = html.match(/<img\b[^>]*>/gi);
  if (!tags) return null;
  for (const tag of tags) {
    for (const name of ["data-src", "data-lazy-src", "src"]) {
      const v = attr(tag, name);
      if (v && !v.trim().startsWith("data:")) return decodeEntities(v.trim());
    }
    const ss = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    if (ss) {
      const first = ss.split(",")[0]?.trim().split(/\s+/)[0];
      if (first && !first.startsWith("data:")) return decodeEntities(first);
    }
  }
  return null;
}

/**
 * Canonical filename for matching an image URL against the media library:
 * lower-cased basename with query/hash removed and any WordPress size
 * suffix stripped (`name-1024x768.webp` -> `name.webp`). Returns null when
 * there's no usable filename.
 */
export function canonicalImageName(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.split("?")[0].split("#")[0];
  let base = clean.slice(clean.lastIndexOf("/") + 1);
  try {
    base = decodeURIComponent(base);
  } catch {
    /* keep raw base if it isn't valid percent-encoding */
  }
  base = base.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
  return base.toLowerCase() || null;
}

/**
 * Given posts that need a body-image fallback ({id, url} where url is the
 * raw body image), return a Map of post id -> a WORKING mirror URL from
 * media_items.storage_url. Raw WordPress body URLs 404 on staging, but the
 * same file usually exists in the Supabase mirror; we match by canonical
 * filename and only return posts we could resolve (so callers keep the
 * colour tile rather than ever showing a broken image).
 */
export async function resolveBodyImageMirrors(
  sb: SupabaseClient,
  candidates: { id: string; url: string }[],
  sourceSite = "v2",
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (candidates.length === 0) return result;

  // canonical filename -> post ids that want it
  const wantByName = new Map<string, string[]>();
  for (const c of candidates) {
    const name = canonicalImageName(c.url);
    if (!name) continue;
    const arr = wantByName.get(name);
    if (arr) arr.push(c.id);
    else wantByName.set(name, [c.id]);
  }
  const names = [...wantByName.keys()];
  if (names.length === 0) return result;

  // Loose ilike match on source_url per filename (drop chars that would
  // break the PostgREST or() syntax); we re-verify by exact canonical name.
  const orExpr = names
    .map((n) => `source_url.ilike.*${n.replace(/[(),*]/g, "")}*`)
    .join(",");
  const { data } = await sb
    .from("media_items")
    .select("source_url, storage_url")
    .eq("source_site", sourceSite)
    .not("storage_url", "is", null)
    .or(orExpr);

  const mirrorByName = new Map<string, string>();
  for (const m of (data ?? []) as { source_url: string | null; storage_url: string | null }[]) {
    const name = canonicalImageName(m.source_url);
    if (name && m.storage_url && !mirrorByName.has(name)) {
      mirrorByName.set(name, m.storage_url);
    }
  }

  for (const [name, ids] of wantByName) {
    const mirror = mirrorByName.get(name);
    if (mirror) for (const id of ids) result.set(id, mirror);
  }
  return result;
}
