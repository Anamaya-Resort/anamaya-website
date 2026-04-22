import Link from "next/link";
import type { PressBarContent } from "@/types/blocks";

const LOGO_HEIGHT = "h-8 sm:h-10";
const FEATURE_HEIGHT = "h-16 sm:h-20";

export default function PressBarBlock({ content }: { content: PressBarContent }) {
  const { heading = "Recommended by:", logos = [], column_widths_pct } = content ?? {};
  if (logos.length === 0) return null;

  // Grid columns from configured percents, falling back to equal columns.
  const gridTemplateColumns =
    column_widths_pct && column_widths_pct.length === logos.length
      ? column_widths_pct.map((w) => `${w}%`).join(" ")
      : `repeat(${logos.length}, minmax(0, 1fr))`;

  return (
    <section className="bg-anamaya-teal-muted px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
          {heading}
        </h2>
        <ul className="grid items-center" style={{ gridTemplateColumns }}>
          {logos.map((logo, i) => {
            const heightClass = logo.featured ? FEATURE_HEIGHT : LOGO_HEIGHT;
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                loading="lazy"
                decoding="async"
                className={`max-w-full object-contain ${heightClass}`}
              />
            );
            return (
              <li
                key={`${logo.name}-${i}`}
                className="flex items-center justify-center px-2 sm:px-3"
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
