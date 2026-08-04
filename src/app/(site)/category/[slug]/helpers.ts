// Small, self-contained helpers for the /category/[slug] listing page.
// Kept local to this route folder so the page file stays focused.

/** Strip HTML tags + collapse whitespace, then trim to ~`words` words. */
export function stripHtmlToWords(html: string | null, words = 30): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ") // drop tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8230;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const parts = text.split(" ");
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(" ") + "…";
}

/** "August 2, 2026" — long, human date. Returns "" for missing/invalid. */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Rough read time in minutes from an HTML body (~220 wpm). 0 = unknown. */
export function readMinutes(html: string | null): number {
  if (!html) return 0;
  const words = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.round(words / 220));
}

/** Absolute live-article URL for a post's url_path (opens the real site). */
export function liveArticleUrl(urlPath: string): string {
  const path = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `https://anamaya.com${path}`;
}
