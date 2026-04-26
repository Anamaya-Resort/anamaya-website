import type { QuoteContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";

/**
 * Quote / testimonial. Three layouts:
 *   - "card":   bordered card with side photo (used in testimonial walls)
 *   - "pull":   centered pull-quote, no photo (mid-article emphasis)
 *   - "banner": full-bleed quote with optional bg color (hero-adjacent)
 */
export default function QuoteBlock({ content }: { content: QuoteContent }) {
  const variant = content?.variant ?? "pull";
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color);
  const pad = content?.padding_y_px ?? (variant === "banner" ? 80 : 48);

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <div
        className={`mx-auto w-full px-6 ${
          variant === "card" ? "max-w-[800px]" : "max-w-[900px] text-center"
        }`}
      >
        {variant === "card" ? (
          <CardLayout content={content} />
        ) : (
          <CenteredLayout content={content} />
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function CardLayout({ content }: { content: QuoteContent }) {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-anamaya-mint bg-white/40 p-6">
      {content.photo_url && (
        <img
          src={content.photo_url}
          alt={content.photo_alt ?? content.attribution ?? ""}
          className="h-20 w-20 flex-shrink-0 rounded-full object-cover"
        />
      )}
      <div className="flex-1">
        <p className="font-heading text-lg italic leading-snug">&ldquo;{content.quote}&rdquo;</p>
        {(content.attribution || content.attribution_role) && (
          <p className="mt-3 text-sm font-semibold">
            {content.attribution}
            {content.attribution_role && (
              <span className="font-normal opacity-70"> — {content.attribution_role}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function CenteredLayout({ content }: { content: QuoteContent }) {
  return (
    <>
      <p className="font-heading text-2xl italic leading-snug sm:text-3xl">
        &ldquo;{content.quote}&rdquo;
      </p>
      {(content.attribution || content.attribution_role) && (
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider">
          {content.attribution}
          {content.attribution_role && (
            <span className="font-normal normal-case opacity-70"> — {content.attribution_role}</span>
          )}
        </p>
      )}
    </>
  );
}
