import type { RawHtmlContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import ProseHtml from "@/components/ProseHtml";

/**
 * Escape hatch for one-off legacy markup that doesn't fit a typed block.
 * Renders via ProseHtml (dangerouslySetInnerHTML) — content MUST be
 * sanitized upstream at write time (extractor or admin save). Use sparingly:
 * prefer a typed block whenever the markup pattern repeats.
 */
export default function RawHtmlBlock({ content }: { content: RawHtmlContent }) {
  if (!content?.html) return null;
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const pad = content?.padding_y_px ?? 32;
  return (
    <section className="w-full" style={{ backgroundColor: bg, paddingTop: pad, paddingBottom: pad }}>
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <ProseHtml html={content.html} />
      </div>
    </section>
  );
}
