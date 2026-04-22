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
  const headingCss = resolveBrandColor(heading_color) ?? fgDefault;
  const headingFontClass = heading_font === "body" ? "font-sans" : "font-heading";

  const gridTemplateColumns =
    column_widths_pct && column_widths_pct.length === logos.length
      ? column_widths_pct.map((w) => `${w}%`).join(" ")
      : `repeat(${logos.length}, minmax(0, 1fr))`;

  return (
    <section className="w-full px-6 py-10" style={{ backgroundColor: bg }}>
      {/* Full-bleed — no max-width cap; logos fill the available width */}
      <div className="mx-auto w-full max-w-[1600px]">
        <h2
          className={`${headingFontClass} mb-6 text-center text-sm font-semibold uppercase tracking-[0.3em]`}
          style={{ color: headingCss }}
        >
          {heading}
        </h2>
        <ul className="grid items-center" style={{ gridTemplateColumns }}>
          {logos.map((logo, i) => {
            const maxH = logo.featured ? featuredHeight : logoHeight;
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                loading="lazy"
                decoding="async"
                className="max-w-full object-contain"
                style={{ maxHeight: maxH, height: "auto" }}
              />
            );
            return (
              <li
                key={`${logo.name}-${i}`}
                className="flex items-center justify-center px-3 sm:px-4"
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
        </ul>
      </div>
    </section>
  );
}
