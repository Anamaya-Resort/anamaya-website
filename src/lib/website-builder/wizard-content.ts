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

// ── Wizard → template-slot content mapping ────────────────────────────────
//
// A template's UNLOCKED variant blocks are the editable slots. To preview the
// wizard's pasted content inside a template, we produce a per-slot override:
// we START from the block's own master content (so the shape stays valid for
// its renderer) and overwrite ONLY the fields we can confirm from that block
// type's real content shape (verified against the blog-post-1 `bp1_*` blocks).
//
// Field names below mirror the live blocks exactly:
//   - hero        → caption.title (headline) + video_poster_url (poster image)
//   - rich_text   → html
//   - image_text  → image_url + html (caption)
//   - image_overlay → image_url + line_1.text (title)
//   - gallery     → images: [{ url }]
// Any other type (person_card, ui_*, reactions, …) gets NO override, so the
// preview always falls back to a valid template default rather than rendering
// something broken.

/** One editable (unlocked) template slot. */
export type WizardSlot = {
  variantBlockId: string;
  typeSlug: string;
  masterContent: unknown;
};

/** The wizard's content, normalised for slot-filling. */
export type WizardSlotContent = {
  title: string;
  bodyHtml: string;
  images: string[];
};

/** A per-slot override ready to upsert into page_block_overrides. */
export type WizardSlotOverride = {
  variantBlockId: string;
  content: unknown;
};

/** Treat an unknown master value as a plain object we can spread over. */
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/**
 * Map the wizard's {title, bodyHtml, images} onto a template's unlocked slots.
 *
 * Returns overrides ONLY for slots we actually fill — unknown/unsupported
 * types are skipped so their template default renders untouched. Images are
 * consumed left-to-right across image-bearing slots (hero, image_text,
 * image_overlay, gallery) via a shared cursor, so the hero and a mid-article
 * image use different pictures when more than one is supplied.
 */
export function mapWizardToSlotOverrides(
  slots: WizardSlot[],
  content: WizardSlotContent,
): WizardSlotOverride[] {
  const images = content.images.filter((u) => typeof u === "string" && u);
  let imageCursor = 0;
  const nextImage = (): string | undefined =>
    imageCursor < images.length ? images[imageCursor++] : undefined;

  const out: WizardSlotOverride[] = [];

  for (const slot of slots) {
    const master = asObject(slot.masterContent);

    switch (slot.typeSlug) {
      case "hero": {
        // Headline lives in caption.title; poster image in video_poster_url.
        const masterCaption = asObject(master.caption);
        const caption: Record<string, unknown> = {
          ...masterCaption,
          enabled: true,
        };
        if (content.title) caption.title = content.title;
        const poster = nextImage();
        const next: Record<string, unknown> = { ...master, caption };
        if (content.title) next.seo_title = content.title;
        if (poster) next.video_poster_url = poster;
        out.push({ variantBlockId: slot.variantBlockId, content: next });
        break;
      }

      case "rich_text": {
        out.push({
          variantBlockId: slot.variantBlockId,
          content: { ...master, html: content.bodyHtml },
        });
        break;
      }

      case "image_text": {
        // Image column = image_url; caption/text = html. Keep master html
        // when there's no body to place.
        const next: Record<string, unknown> = { ...master };
        const img = nextImage();
        if (img) next.image_url = img;
        out.push({ variantBlockId: slot.variantBlockId, content: next });
        break;
      }

      case "image_overlay": {
        const next: Record<string, unknown> = { ...master };
        const img = nextImage();
        if (img) next.image_url = img;
        if (content.title) {
          next.line_1 = { ...asObject(master.line_1), text: content.title };
        }
        out.push({ variantBlockId: slot.variantBlockId, content: next });
        break;
      }

      case "gallery": {
        const remaining: string[] = [];
        for (let img = nextImage(); img; img = nextImage()) remaining.push(img);
        if (remaining.length === 0) break; // nothing to place — keep default
        out.push({
          variantBlockId: slot.variantBlockId,
          content: { ...master, images: remaining.map((url) => ({ url })) },
        });
        break;
      }

      // person_card and every other type: no override — render the default.
      default:
        break;
    }
  }

  return out;
}
