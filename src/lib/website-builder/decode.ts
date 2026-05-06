/**
 * HTML-entity decoder used by Website Builder list views. Handles both named
 * entities and numeric character references (e.g. &#038;, &#x26;) since WP
 * serves both forms — &#038; in particular is how WP encodes & in titles.
 * &amp; is decoded last so we don't double-decode &amp;#038; → &.
 */
const NAMED: Record<string, string> = {
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  amp: "&",
};

export function decodeEntities(s: string): string {
  return s.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED[body] ?? match;
    },
  );
}
