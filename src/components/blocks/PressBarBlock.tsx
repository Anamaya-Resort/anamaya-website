import Link from "next/link";
import type { PressBarContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Resolve background color + a readable default heading color.
 * Handles new brand-token keys, legacy preset names, and legacy
 * bg_color="custom" + bg_color_custom hex from pre-brand-tokens rows.
 */
function resolveBg(content: PressBarContent): { bg: string; fgDefault: string } {
  const raw =
    content.bg_color === "custom"
      ? (content.bg_color_custom ?? "")
      : (content.bg_color ?? "");
  const key = raw || "brandDivider";
  const bg = resolveBrandColor(key) ?? "#7aa59e";
  const lightBgKeys = new Set([
    "brand", "brandSubtle", "brandBtnText",
    "cream", "white", "mint",
  ]);
  const fgDefault = lightBgKeys.has(key) ? "#444444" : "#ffffff";
  return { bg, fgDefault };
}

export default function PressBarBlock({ content }: { content: PressBarContent }) {
  const {
    heading = "Recommended by:",
    logos = [],
    column_widths_pct,
    heading_color,
    heading_font = "heading",
  } = content ?? {};
  if (logos.length === 0) return null;

  const { bg, fgDefault } = resolveBg(content);
  const logoHeight = content.logo_height_px ?? 48;
  const featuredHeight = logoHeight * 2;
  const sectionHeight = content.section_height_px ?? 200;
  const headingCss = resolveBrandColor(heading_color) ?? fgDefault;
  const headingFontClass = heading_font === "body" ? "font-sans" : "font-heading";

  // Layout weights: left gutter | logo1 ... logoN | right gutter.
  // Each cell's % is treated as a fr unit so non-100 totals normalise
  // proportionally — editors can mix any numbers without the grid
  // breaking. Inter-cell spacing is a uniform pixel gap (no per-cell
  // padding any more).
  const lg = clamp(content.left_gutter_pct ?? 5, 0, 100);
  const rg = clamp(content.right_gutter_pct ?? 5, 0, 100);
  const gap = clamp(content.gap_px ?? 16, 0, 200);
  const logoWeights = logos.map((logo, i) => {
    if (
      column_widths_pct &&
      column_widths_pct.length === logos.length &&
      Number.isFinite(column_widths_pct[i])
    ) {
      return column_widths_pct[i];
    }
    return logo.featured ? 2 : 1;
  });
  const gridTemplateColumns = [
    `${lg}fr`,
    ...logoWeights.map((w) => `${w}fr`),
    `${rg}fr`,
  ].join(" ");

  return (
    <section
      className="flex w-full flex-col justify-center py-6"
      style={{ backgroundColor: bg, minHeight: sectionHeight }}
    >
      <h2
        className={`${headingFontClass} text-center font-semibold uppercase tracking-[0.3em]`}
        style={{
          color: headingCss,
          fontSize: content.heading_size_px ?? 14,
          marginBottom: content.heading_gap_px ?? 24,
        }}
      >
        {heading}
      </h2>
      {/* Full-viewport-width grid: gutter + N logos + gutter. fr units
          let the editor's percentages distribute proportionally without
          summing to exactly 100. */}
      <ul
        className="grid w-full items-center"
        style={{ gridTemplateColumns, columnGap: gap }}
      >
        <li aria-hidden="true" />
        {logos.map((logo, i) => {
          const maxH = logo.featured ? featuredHeight : logoHeight;
          const adjust = Number.isFinite(logo.size_adjust_pct)
            ? (logo.size_adjust_pct as number)
            : 0;
          const scale = 1 + adjust / 100;
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.src}
              alt={logo.name}
              width={logo.width}
              height={logo.height}
              loading="lazy"
              decoding="async"
              className="block w-full object-contain"
              style={{
                height: maxH,
                maxHeight: maxH,
                transform: scale === 1 ? undefined : `scale(${scale})`,
                transformOrigin: "center",
              }}
            />
          );
          return (
            <li
              key={`${logo.name}-${i}`}
              className="flex items-center justify-center"
            >
              {logo.href ? (
                <Link
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Read the article in ${logo.name}`}
                  className="block transition-opacity hover:opacity-80"
                >
                  {img}
                </Link>
              ) : (
                img
              )}
            </li>
          );
        })}
        <li aria-hidden="true" />
      </ul>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
