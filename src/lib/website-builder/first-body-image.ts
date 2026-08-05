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
