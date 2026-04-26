import type { DividerContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Section divider — a thin break between content sections. Used heavily
 * by the legacy WP retreat template's "flower divider" (an ornament
 * variant pointing at a stored SVG). The "spacer" variant just adds
 * vertical space without rendering anything.
 */
export default function DividerBlock({ content }: { content: DividerContent }) {
  const variant = content?.variant ?? "rule";
  const spacing = content?.spacing_px ?? 48;
  const color = resolveBrandColor(content?.color) ?? "var(--brand-divider)";
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, paddingTop: spacing / 2, paddingBottom: spacing / 2 }}
      aria-hidden="true"
    >
      {variant === "rule" && (
        <div className="mx-auto max-w-[1200px] px-6">
          <hr className="border-0" style={{ borderTop: `1px solid ${color}` }} />
        </div>
      )}
      {variant === "ornament" && (
        <div className="flex w-full items-center justify-center">
          {content?.ornament_url ? (
            <img
              src={content.ornament_url}
              alt=""
              style={{ maxWidth: content?.ornament_width_px ?? 80, height: "auto" }}
            />
          ) : (
            <DefaultOrnament color={color} width={content?.ornament_width_px ?? 80} />
          )}
        </div>
      )}
      {variant === "spacer" && null}
    </section>
  );
}

function DefaultOrnament({ color, width }: { color: string; width: number }) {
  return (
    <svg viewBox="0 0 80 16" width={width} height={width * 0.2} fill={color}>
      <circle cx="40" cy="8" r="3" />
      <circle cx="22" cy="8" r="1.5" opacity="0.7" />
      <circle cx="58" cy="8" r="1.5" opacity="0.7" />
      <circle cx="8" cy="8" r="1" opacity="0.4" />
      <circle cx="72" cy="8" r="1" opacity="0.4" />
    </svg>
  );
}
