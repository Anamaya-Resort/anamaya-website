import "server-only";

/**
 * Content chunking for the embedding pipeline. We aim for ~1500-char
 * chunks that respect paragraph boundaries — small enough to fit
 * many in a model context, large enough that retrieval returns
 * substantively useful passages.
 *
 * HTML is stripped to plain text first. The visitor agent doesn't
 * need markup; embedding budget is better spent on actual prose.
 */

const TARGET_CHARS = 1500;
const MIN_CHUNK_CHARS = 200;
const MAX_CHUNK_CHARS = 2200;

/**
 * Strip HTML to readable plain text. Drops <script>/<style> entirely,
 * collapses whitespace, decodes a small set of common entities. This
 * is intentionally simpler than a full DOM pass — these chunks are for
 * embedding, not rendering.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    // Block-level closers become paragraph breaks so chunks split at
    // semantically meaningful boundaries.
    .replace(/<\/(p|div|li|h[1-6]|blockquote|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Split a body of text into chunks. Splits on paragraph boundaries
 * (\n\n), then merges paragraphs greedily until adding the next would
 * exceed MAX_CHUNK_CHARS. Long paragraphs that exceed MAX on their own
 * are split at sentence boundaries; if a single sentence is still too
 * long, a hard cut at TARGET_CHARS.
 */
export function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= MAX_CHUNK_CHARS) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  function flush() {
    if (current.trim().length >= MIN_CHUNK_CHARS) {
      chunks.push(current.trim());
    } else if (current.trim().length > 0 && chunks.length > 0) {
      // Tail too small — fold into the previous chunk so we never emit
      // tiny stragglers.
      chunks[chunks.length - 1] = chunks[chunks.length - 1] + "\n\n" + current.trim();
    } else if (current.trim().length > 0) {
      chunks.push(current.trim());
    }
    current = "";
  }

  for (const para of paragraphs) {
    if (para.length > MAX_CHUNK_CHARS) {
      // Paragraph alone exceeds limit. Flush current, then split.
      if (current) flush();
      for (const piece of splitLongParagraph(para)) {
        chunks.push(piece);
      }
      continue;
    }
    if (current.length === 0) {
      current = para;
    } else if (current.length + 2 + para.length <= TARGET_CHARS) {
      current = current + "\n\n" + para;
    } else {
      flush();
      current = para;
    }
  }
  flush();
  return chunks;
}

function splitLongParagraph(para: string): string[] {
  const sentences = para.split(/(?<=[.!?])\s+(?=[A-Z])/);
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (s.length > MAX_CHUNK_CHARS) {
      // Single sentence too long — hard cut.
      if (current) {
        out.push(current.trim());
        current = "";
      }
      for (let i = 0; i < s.length; i += TARGET_CHARS) {
        out.push(s.slice(i, i + TARGET_CHARS));
      }
      continue;
    }
    if (current.length === 0) {
      current = s;
    } else if (current.length + 1 + s.length <= TARGET_CHARS) {
      current = current + " " + s;
    } else {
      out.push(current.trim());
      current = s;
    }
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}
