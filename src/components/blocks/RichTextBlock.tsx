import type { RichTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import ProseHtml from "@/components/ProseHtml";
import DecorationOverlay from "./shared/DecorationOverlay";
import LayoutWidths from "./shared/LayoutWidths";

// Admin block-preview only: sample prose so an empty rich-text block still
// renders with visible height.
const SAMPLE_HTML =
  "<h2>A place to arrive, and to let go</h2>" +
  "<p>Perched on a clifftop above the Pacific, our retreat is a space to slow down — to breathe with the tide, move through morning yoga, and rest in the quiet between.</p>" +
  "<p>Nourishing plant-forward meals, unhurried afternoons, and evenings under an open sky make room for whatever you came here to find.</p>";

export default function RichTextBlock({
  content,
  preview,
}: {
  content: RichTextContent;
  /** Admin block-preview only: render sample prose when the html is empty
   *  so the design shows. Never set on public render paths. */
  preview?: boolean;
}) {
  const html =
    preview && !content?.html?.trim() ? SAMPLE_HTML : content?.html;
  if (!html) return null;
  const bg = resolveBrandColor(content?.bg_color) ?? "#ffffff";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const inner = (
    <LayoutWidths
      content={content}
      defaultMaxContentPx={content?.content_width_px ?? 0}
      className="relative"
    >
      <ProseHtml html={html} />
    </LayoutWidths>
  );

  return (
    <section
      className="relative w-full overflow-hidden px-6"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <DecorationOverlay frame={content} />
      {inner}
    </section>
  );
}
