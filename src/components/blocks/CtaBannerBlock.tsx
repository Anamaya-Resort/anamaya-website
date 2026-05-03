import Link from "next/link";
import type { CtaBannerContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

const DEFAULT_BG_HEX = "#444444"; // anamaya-charcoal

/**
 * Centred CTA banner with optional background image. The image now sits
 * in its own absolute layer so it can be made translucent or blended
 * with the section's background colour — useful for "tinted photo"
 * looks where the underlying brand colour shows through.
 */
export default function CtaBannerBlock({ content }: { content: CtaBannerContent }) {
  const bgColor = resolveBrandColor(content.bg_color) ?? DEFAULT_BG_HEX;
  const opacity = Math.max(0, Math.min(100, content.bg_image_opacity ?? 100)) / 100;
  const blendMode = content.bg_image_blend_mode ?? "normal";

  return (
    <section
      className="relative overflow-hidden px-6 py-24 text-white"
      style={{ backgroundColor: bgColor }}
    >
      {content.bg_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${content.bg_image_url})`,
            opacity,
            mixBlendMode: blendMode,
          }}
          aria-hidden="true"
        />
      )}
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.heading}
        </h2>
        {content.subheading && (
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90">
            {content.subheading}
          </p>
        )}
        {content.cta?.href && content.cta?.label && (
          <Link
            href={content.cta.href}
            className="mt-8 inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            {content.cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
