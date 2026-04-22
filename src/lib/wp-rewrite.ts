// Utilities to rewrite URLs inside WordPress-rendered HTML for use on the new site.
// Pure functions — take a string and a lookup map, return a string.
//
// Typical use:
//   1. Extract all /wp-content/uploads/... URLs from content_rendered via extractMediaUrls()
//   2. Look up those source_urls in media_items to get their storage_urls
//   3. Call rewriteHtml() with the resulting source->storage map and the list of WP hosts

const WP_UPLOADS_RE = /\/wp-content\/uploads\/[^\s"'<>()]+/g;

export type RewriteOptions = {
  // Hosts whose absolute URLs should be stripped to path-only (internal links).
  // e.g. ["anamayastg.wpenginepowered.com", "anamaya.com"]
  sourceHosts: string[];
  // source_url -> storage_url mapping for media files.
  mediaMap: Map<string, string>;
};

/** Return all absolute /wp-content/uploads/... URLs referenced in the HTML. */
export function extractMediaUrls(html: string, sourceHosts: string[]): string[] {
  const urls = new Set<string>();
  for (const host of sourceHosts) {
    const re = new RegExp(`https?://${host.replace(/\./g, "\\.")}\\/wp-content\\/uploads\\/[^\\s"'<>()]+`, "g");
    for (const m of html.matchAll(re)) urls.add(m[0]);
  }
  // Also catch protocol-relative references (rare)
  const protRel = html.matchAll(/(?:^|[^:])\/\/([^/\s"']+)(\/wp-content\/uploads\/[^\s"'<>()]+)/g);
  for (const m of protRel) {
    if (sourceHosts.includes(m[1])) urls.add(`https://${m[1]}${m[2]}`);
  }
  return [...urls];
}

/** Rewrite absolute URLs in HTML. Images get swapped to storage_url; internal links lose host. */
export function rewriteHtml(html: string, opts: RewriteOptions): string {
  let out = html;

  // 1. Swap media URLs (longest first to avoid partial-match conflicts)
  const mediaEntries = [...opts.mediaMap.entries()].sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [src, dst] of mediaEntries) {
    // Split + join avoids regex escaping hell and is plenty fast for realistic N.
    if (out.includes(src)) out = out.split(src).join(dst);
  }

  // 2. Strip source hosts to make remaining internal links relative
  for (const host of opts.sourceHosts) {
    const absHttps = `https://${host}`;
    const absHttp = `http://${host}`;
    if (out.includes(absHttps)) out = out.split(absHttps).join("");
    if (out.includes(absHttp)) out = out.split(absHttp).join("");
  }

  return out;
}
