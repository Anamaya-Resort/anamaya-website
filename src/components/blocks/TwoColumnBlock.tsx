import type { BlockUsage, TwoColumnContent, TwoColumnSide } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import BlockRenderer from "./BlockRenderer";
import CtaButton from "./shared/CtaButton";

/**
 * Two-column layout primitive. Each side carries another block type's
 * content; the renderer wraps each side in a synthetic BlockUsage and
 * dispatches recursively to BlockRenderer so each side renders identically
 * to its standalone block type.
 *
 * Optional shared CTA renders below both columns, full-width.
 */
export default function TwoColumnBlock({ content }: { content: TwoColumnContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const padY = content?.padding_y_px ?? 64;
  const gap = content?.gap_px ?? 48;
  const containerWidth = content?.container_width_px ?? 1200;
  const leftPct = Math.max(20, Math.min(80, content?.left_width_pct ?? 50));
  const rightPct = 100 - leftPct;
  const valign = content?.vertical_align ?? "top";
  const alignItems =
    valign === "center" ? "center" : valign === "bottom" ? "end" : "start";
  const stack = content?.mobile_stack ?? true;

  const left = renderSide(content?.left);
  const right = renderSide(content?.right);

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color, paddingTop: padY, paddingBottom: padY }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <div
          className={`grid ${stack ? "grid-cols-1 md:grid-cols-[var(--cols)]" : ""}`}
          style={
            {
              ["--cols" as string]: `${leftPct}fr ${rightPct}fr`,
              gridTemplateColumns: stack ? undefined : `${leftPct}fr ${rightPct}fr`,
              alignItems,
              gap,
            } as React.CSSProperties
          }
        >
          <div className="min-w-0">{left}</div>
          <div className="min-w-0">{right}</div>
        </div>
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function renderSide(side: TwoColumnSide | undefined) {
  if (!side?.type_slug) return null;
  const usage: BlockUsage = {
    id: `two-col-${side.type_slug}`,
    block: {
      id: `two-col-${side.type_slug}`,
      type_slug: side.type_slug,
      name: "(two-column child)",
      content: side.content,
    },
    content: side.content,
    page_key: "(inline)",
    sort_order: 0,
  };
  return <BlockRenderer usage={usage} />;
}
