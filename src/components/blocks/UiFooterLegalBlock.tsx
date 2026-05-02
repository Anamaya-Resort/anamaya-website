import type { UiFooterLegalContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

const DEFAULT_BG_HEX = "#fbfbfb";   // anamaya-cream
const DEFAULT_TEXT_HEX = "#444444"; // anamaya-charcoal

/**
 * Light "legal" footer strip — copyright + Terms / Privacy / credit.
 * The literal token "{year}" in body_html is replaced with the current
 * year at render time so the editor never has to bump the date.
 *
 * Body is sanitized HTML written via the rich-text editor; inline links
 * are preserved.
 */
export default function UiFooterLegalBlock({ content }: { content: UiFooterLegalContent }) {
  const c = content ?? {};
  const bg = resolveBrandColor(c.bg_color) ?? DEFAULT_BG_HEX;
  const textColor = resolveBrandColor(c.text_color) ?? DEFAULT_TEXT_HEX;
  const align = c.align ?? "center";
  const padY = c.padding_y_px ?? 16;
  const fontSize = c.font_size_px ?? 12;

  const year = new Date().getFullYear();
  const html = (c.body_html ?? "").replace(/\{year\}/g, String(year));

  const alignClass =
    align === "left" ? "text-left"
    : align === "right" ? "text-right"
    : "text-center";

  return (
    <section
      className={`prose-anamaya prose-anamaya-block ${alignClass}`}
      style={{
        backgroundColor: bg,
        color: textColor,
        paddingTop: padY,
        paddingBottom: padY,
        fontSize,
      }}
    >
      <div
        className="mx-auto max-w-7xl px-6 lg:px-8"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
