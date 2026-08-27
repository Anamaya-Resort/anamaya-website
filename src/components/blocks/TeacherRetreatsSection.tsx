import type { TeacherRetreatsContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { RetreatCard, clamp, type RetreatCardData } from "./RetreatCard";
import LayoutWidths from "./shared/LayoutWidths";

/**
 * Shared renderer for the upcoming/past teacher-retreats blocks -- same
 * card grid as FeaturedRetreatsBlock, just fed a caller-supplied list.
 * Renders nothing when the list is empty (the caller decides that; both
 * blocks return null before reaching here in that case, but this also
 * guards direct reuse).
 */
export default function TeacherRetreatsSection({
  content,
  retreats,
  defaultHeading,
  defaultRegisterLabel,
}: {
  content: TeacherRetreatsContent;
  retreats: RetreatCardData[];
  defaultHeading: string;
  defaultRegisterLabel: string;
}) {
  if (retreats.length === 0) return null;

  const c = content ?? {};
  const heading = c.heading ?? defaultHeading;
  const subheading = c.subheading ?? "";
  const registerLabel = c.register_label ?? defaultRegisterLabel;
  const urlPattern = c.url_pattern || "/retreats/{slug}/";
  const containerWidth = c.container_width_px ?? 1200;
  const padY = c.padding_y_px ?? 56;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;
  const cardBg = resolveBrandColor(c.card_bg_color);
  const cardBorder = resolveBrandColor(c.card_border_color);
  const cardBorderWidth = clamp(c.card_border_width_px ?? 1, 0, 10);
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 40);

  return (
    <section
      className="relative w-full"
      style={{ backgroundColor: bg, color: textColor, paddingTop: padY, paddingBottom: padY }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <header className="text-center">
          <h2
            className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl"
            style={{ color: headingColor }}
          >
            {heading}
          </h2>
          {subheading && (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed opacity-80">
              {subheading}
            </p>
          )}
        </header>
      </div>

      <LayoutWidths content={c} defaultMaxContentPx={1760} className="mt-10">
        <ul className="grid justify-center gap-8 [grid-template-columns:minmax(0,840px)] min-[1760px]:[grid-template-columns:repeat(2,minmax(0,840px))]">
          {retreats.map((r) => (
            <RetreatCard
              key={r.id}
              r={r}
              opts={{
                urlPattern,
                registerLabel,
                headingColor,
                cardBg,
                cardBorder,
                cardBorderWidth,
                cardRadius,
              }}
            />
          ))}
        </ul>
      </LayoutWidths>
    </section>
  );
}
