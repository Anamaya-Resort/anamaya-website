// Utilities to rewrite URLs inside WordPress-rendered HTML for use on the new site.
//
// WordPress generates size variants on the fly (foo-300x300.webp, foo-800x600.webp, etc.)
// that are NOT stored as separate rows in our media_items table. When they appear in
// scraped HTML, we need to substitute them with the closest available original.
//
// Strategy:
//   1. Find every /wp-content/uploads/... URL in the HTML
//   2. For each one, try exact match in the media map first
//   3. If no exact match, strip the -WIDTHxHEIGHT suffix and look up the base URL
//   4. Substitute with the resolved storage_url (or leave as-is if no match)

const UPLOADS_RE_SRC = /https?:\/\/[^\s"'<>()]+\/wp-content\/uploads\/[^\s"'<>()]+/g;
const SIZE_SUFFIX_RE = /-\d{2,4}x\d{2,4}(?=\.(?:webp|jpg|jpeg|png|gif|avif)(?:\?|$))/i;

export type RewriteOptions = {
  /** Hosts whose absolute URLs should be stripped to path-only (internal links). */
  sourceHosts: string[];
  /** Known `source_url` → `storage_url` mapping for migrated media. */
  mediaMap: Map<string, string>;
};

/** Strip WP's -WIDTHxHEIGHT size variant from a URL to get the base file URL. */
export function stripSizeVariant(url: string): string {
  return url.replace(SIZE_SUFFIX_RE, "");
}

/** Every /wp-content/uploads/... URL referenced in the HTML. */
export function extractMediaUrls(html: string, _sourceHosts: string[]): string[] {
  // _sourceHosts unused but kept for API compatibility.
  const urls = new Set<string>();
  for (const m of html.matchAll(UPLOADS_RE_SRC)) urls.add(m[0]);
  return [...urls];
}

/**
 * Return the de-duplicated list of candidate source URLs to query `media_items` for.
 * Includes both the exact URL AND its base-without-size-variant.
 */
export function candidateBaseUrls(html: string, sourceHosts: string[]): string[] {
  const all = new Set<string>();
  for (const u of extractMediaUrls(html, sourceHosts)) {
    all.add(u);
    const base = stripSizeVariant(u);
    if (base !== u) all.add(base);
  }
  return [...all];
}

/** Rewrite absolute URLs in HTML. Tries size-variant base fallback. */
export function rewriteHtml(html: string, opts: RewriteOptions): string {
  let out = html;

  // Build an extended map that also maps size-variant URLs to the base's
  // storage_url (when base is known).
  const fullMap = new Map<string, string>(opts.mediaMap);
  for (const u of extractMediaUrls(html, opts.sourceHosts)) {
    if (fullMap.has(u)) continue;
    const base = stripSizeVariant(u);
    if (base !== u && fullMap.has(base)) fullMap.set(u, fullMap.get(base)!);
  }

  // Replace longest keys first to avoid partial-match collisions.
  const entries = [...fullMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [src, dst] of entries) {
    if (out.includes(src)) out = out.split(src).join(dst);
  }

  // Strip source hosts on internal links so they become relative.
  for (const host of opts.sourceHosts) {
    for (const prefix of [`https://${host}`, `http://${host}`]) {
      if (out.includes(prefix)) out = out.split(prefix).join("");
    }
  }

  return out;
}
