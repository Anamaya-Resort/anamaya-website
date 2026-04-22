import Link from "next/link";
import type { PressBarBgPreset, PressBarContent } from "@/types/blocks";

/** Map a preset slug (or arbitrary CSS color) to actual CSS values. */
function resolveBg(content: PressBarContent): { bg: string; fgDefault: string } {
  const preset = (content.bg_color ?? "teal-muted") as PressBarBgPreset;
  switch (preset) {
    case "mint":       return { bg: "#b8d3cf", fgDefault: "#444444" };
    case "cream":      return { bg: "#fbfbfb", fgDefault: "#444444" };
    case "white":      return { bg: "#ffffff", fgDefault: "#444444" };
    case "charcoal":   return { bg: "#444444", fgDefault: "#ffffff" };
    case "custom":     return { bg: content.bg_color_custom ?? "#7aa59e", fgDefault: "#ffffff" };
    case "teal-muted":
    default:           return { bg: "#7aa59e", fgDefault: "#ffffff" };
  }
}

export default function PressBarBlock({ content }: { content: PressBarContent }) {
  const {
    heading = "Recommended by:",
    logos = [],
    column_widths_pct,
    heading_color,
  } = content ?? {};
  if (logos.length === 0) return null;

  const { bg, fgDefault } = resolveBg(content);
  const logoHeight = content.logo_height_px ?? 48;
  const featuredHeight = logoHeight * 2;

  const gridTemplateColumns =
    column_widths_pct && column_widths_pct.length === logos.length
      ? column_widths_pct.map((w) => `${w}%`).join(" ")
      : `repeat(${logos.length}, minmax(0, 1fr))`;

  return (
    <section className="w-full px-6 py-10" style={{ backgroundColor: bg }}>
      {/* Full-bleed — no max-width cap; logos fill the available width */}
      <div className="mx-auto w-full max-w-[1600px]">
        <h2
          className="font-heading mb-6 text-center text-sm font-semibold uppercase tracking-[0.3em]"
          style={{ color: heading_color ?? fgDefault }}
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
