import type { RichTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import ProseHtml from "@/components/ProseHtml";
import DecorationOverlay from "./shared/DecorationOverlay";

export default function RichTextBlock({ content }: { content: RichTextContent }) {
  if (!content?.html) return null;
  const bg = resolveBrandColor(content?.bg_color) ?? "#ffffff";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const contentWidth = content?.content_width_px ?? 720;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <DecorationOverlay frame={content} />
      <div className="relative mx-auto w-full px-6" style={{ maxWidth: contentWidth }}>
        <ProseHtml html={content.html} />
      </div>
    </section>
  );
}
