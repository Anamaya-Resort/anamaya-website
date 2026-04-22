import type { BlockCta } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Centered Call-To-Action button rendered at the bottom of a block.
 * Returns null if CTA isn't enabled or required fields are missing.
 * Shared across rich_bg / video_showcase / checklist / image_overlay /
 * image_text so they all render the button identically.
 */
export default function CtaButton({ cta }: { cta: BlockCta }) {
  if (!cta?.cta_enabled) return null;
  const label = cta.cta_label?.trim();
  const href = cta.cta_href?.trim();
  if (!label || !href) return null;

  const bg = resolveBrandColor(cta.cta_bg_color) ?? "#A35B4E";
  const color = resolveBrandColor(cta.cta_text_color) ?? "#ffffff";
  const fontClass = cta.cta_font === "heading" ? "font-heading" : "font-sans";
  const size = cta.cta_size_px ?? 14;

  return (
    <div className="mt-6 flex w-full justify-center">
      <a
        href={href}
        className={`${fontClass} inline-block rounded-full font-semibold uppercase tracking-wider transition-opacity hover:opacity-90`}
        style={{
          backgroundColor: bg,
          color,
          fontSize: size,
          // Padding scales gently with font size so larger buttons feel
          // balanced without the editor having to tune it.
          padding: `${Math.round(size * 0.85)}px ${Math.round(size * 2.2)}px`,
        }}
      >
        {label}
      </a>
    </div>
  );
}
