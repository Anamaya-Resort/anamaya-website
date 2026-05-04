import type { TestimonialsBlockContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { getFeaturedTestimonials, type Testimonial } from "@/lib/testimonials";
import TestimonialsCarousel from "./shared/TestimonialsCarousel";
import TestimonialsSchema from "./shared/TestimonialsSchema";

/**
 * Full-width Testimonials carousel. Pulls only `featured = true` rows
 * from the chosen category (testimonial_sets.slug). All slides are
 * server-rendered as semantic <figure><blockquote> markup so search
 * engines and LLM crawlers see every testimonial in the initial HTML;
 * the client island handles the 4s display + 2s crossfade rotation.
 *
 * Layout (matches anamaya.com homepage testimonials section):
 *   - "TESTIMONIALS" headline
 *   - Per slide: review title (h3), italic body in quotes,
 *     "Trip Advisor Review · {date}  → Full Review" attribution,
 *     and the TripAdvisor 5-star badge.
 */
export default async function TestimonialsBlock({
  content,
}: {
  content: TestimonialsBlockContent;
}) {
  const c = content ?? {};
  if (!c.category_slug) return null;

  const items = await getFeaturedTestimonials(c.category_slug, c.max_count);
  if (items.length === 0) return null;

  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color);
  const headingColor = resolveBrandColor(c.heading_color);
  const padY = c.padding_y_px ?? 80;
  const maxW = c.content_width_px ?? 900;

  const bgImageOpacity = clamp(c.bg_image_opacity ?? 100, 0, 100) / 100;
  const bgImageBlend = c.bg_image_blend_mode ?? "normal";
  const heading = c.heading ?? "TESTIMONIALS";
  const showBadge = c.show_tripadvisor_badge ?? true;

  const display = c.display_seconds ?? 4;
  const fade = c.fade_seconds ?? 2;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, color: textColor, paddingTop: padY, paddingBottom: padY }}
    >
      {c.bg_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${c.bg_image_url})`,
            opacity: bgImageOpacity,
            mixBlendMode: bgImageBlend as React.CSSProperties["mixBlendMode"],
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative mx-auto w-full px-6" style={{ maxWidth: maxW }}>
        <h2
          className="mb-10 text-center font-heading text-3xl font-semibold uppercase tracking-[0.3em] sm:text-4xl"
          style={{ color: headingColor }}
        >
          {heading}
        </h2>

        {/* Slides — all rendered into the DOM (so SEO + LLM crawlers
            see every testimonial), the carousel client island toggles
            opacity to crossfade between them. CSS grid stacks all
            slides in one cell so the container auto-sizes to the
            tallest slide; no risk of clipping long reviews. */}
        <div
          data-testimonials-carousel
          className="grid"
          style={{ gridTemplateAreas: '"stack"', gridTemplateColumns: "1fr" }}
        >
          {items.map((t, i) => (
            <Slide
              key={t.id}
              t={t}
              firstVisible={i === 0}
              fadeSeconds={fade}
              showBadge={showBadge}
            />
          ))}
        </div>

        {items.length > 1 && (
          <TestimonialsCarousel
            count={items.length}
            displaySeconds={display}
            fadeSeconds={fade}
          />
        )}
      </div>

      <TestimonialsSchema items={items} />
    </section>
  );
}

function Slide({
  t,
  firstVisible,
  fadeSeconds,
  showBadge,
}: {
  t: Testimonial;
  firstVisible: boolean;
  fadeSeconds: number;
  showBadge: boolean;
}) {
  const quote = t.excerpt && t.excerpt.trim() !== "" ? t.excerpt : t.review_text;
  const attribution = t.date_of_stay
    ? `TripAdvisor Review · ${t.date_of_stay}`
    : "TripAdvisor Review";

  return (
    <figure
      data-testimonials-slide
      aria-hidden={firstVisible ? undefined : "true"}
      itemScope
      itemType="https://schema.org/Quotation"
      className={`flex flex-col items-center text-center transition-opacity ease-in-out ${
        firstVisible ? "" : "pointer-events-none"
      }`}
      style={{
        gridArea: "stack",
        opacity: firstVisible ? 1 : 0,
        transitionDuration: `${fadeSeconds * 1000}ms`,
      }}
    >
      {t.title && (
        <h3
          className="mb-4 font-heading text-xl font-semibold leading-snug sm:text-2xl"
          itemProp="name"
        >
          &ldquo;{t.title}&rdquo;
        </h3>
      )}
      <blockquote
        className="text-balance text-base italic leading-relaxed sm:text-lg"
        itemProp="text"
        cite={t.review_url ?? undefined}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex flex-wrap items-center justify-center gap-x-2 text-sm">
        <span>{attribution}</span>
        {t.review_url && (
          <>
            <span aria-hidden="true">→</span>
            <a
              href={t.review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: "inherit" }}
            >
              Full Review
            </a>
          </>
        )}
      </figcaption>
      {showBadge && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/tripadvisor-5-stars.webp"
            alt={`${t.rating} out of 5 stars on TripAdvisor`}
            width={280}
            height={56}
            loading="lazy"
            decoding="async"
            className="h-14 w-auto"
          />
        </div>
      )}
    </figure>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
