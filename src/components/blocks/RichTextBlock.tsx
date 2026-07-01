import type { RichTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import ProseHtml from "@/components/ProseHtml";
import DecorationOverlay from "./shared/DecorationOverlay";
import LayoutWidths from "./shared/LayoutWidths";

export default function RichTextBlock({ content }: { content: RichTextContent }) {
  if (!content?.html) return null;
  const bg = resolveBrandColor(content?.bg_color) ?? "#ffffff";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const inner = (
    <LayoutWidths
      content={content}
      defaultMaxContentPx={content?.content_width_px ?? 0}
      className="relative"
    >
      <ProseHtml html={content.html} />
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
