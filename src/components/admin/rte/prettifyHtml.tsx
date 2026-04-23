/**
 * Reformats the compact HTML that TipTap's getHTML() produces into a
 * human-readable tree: block-level tags on their own lines, nested
 * <li> / <p> indented two spaces per level.
 *
 * No dependency. Not a general-purpose HTML beautifier — only handles
 * what the editor actually produces (StarterKit + Link + Underline +
 * TextAlign + TextStyle + inline marks). If we start emitting more
 * exotic tags we can swap in a real beautifier.
 */

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "aside",
  "figure",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link"]);

export function prettifyHtml(html: string): string {
  if (!html) return "";

  // Tokenise into tags vs text. Inline tags (strong, em, a, span, u, s,
  // code, mark…) stay glued to their surrounding text; only block and
  // void tags trigger a newline.
  const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];

  const out: string[] = [];
  let depth = 0;
  let current = "";

  const flush = () => {
    if (current.trim().length > 0) {
      out.push("  ".repeat(depth) + current.trim());
    }
    current = "";
  };

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      current += token;
      continue;
    }

    const name = token
      .replace(/^<\/?/, "")
      .replace(/\s.*$/, "")
      .replace(/\/?>$/, "")
      .toLowerCase();
    const isClosing = token.startsWith("</");
    const isSelfClose = token.endsWith("/>");
    const isVoid = VOID_TAGS.has(name);
    const isBlock = BLOCK_TAGS.has(name);

    if (isBlock) {
      flush();
      if (isClosing) {
        depth = Math.max(0, depth - 1);
        out.push("  ".repeat(depth) + token);
      } else {
        out.push("  ".repeat(depth) + token);
        if (!isSelfClose) depth += 1;
      }
    } else if (isVoid) {
      current += token;
      if (name === "br") {
        // <br> is a hint that the next text starts a new line.
        flush();
      }
    } else {
      // Inline tag — keep on the current line.
      current += token;
    }
  }

  flush();

  return out.join("\n");
}
