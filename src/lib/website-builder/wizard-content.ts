// Turn the Add-New-Post wizard's pasted body into HTML.
//
// If the paste already looks like HTML (has block-level tags), keep it as-is.
// Otherwise treat it as plain text and preserve the author's spacing: a blank
// line starts a new <p>, a single newline becomes <br>. Plain text is escaped
// so stray <, >, & don't turn into accidental (or unsafe) markup.

const HTML_TAG_RE =
  /<(?:p|div|h[1-6]|ul|ol|li|br|img|figure|figcaption|blockquote|section|article|span|a|strong|em|b|i|table|iframe)\b/i;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convert pasted text/HTML into paragraph-preserving HTML. */
export function bodyToHtml(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Already HTML — trust the author's markup.
  if (HTML_TAG_RE.test(text)) return text.trim();
  // Plain text: blank-line-separated paragraphs, single newlines -> <br>.
  return text
    .split(/\n[ \t]*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}
