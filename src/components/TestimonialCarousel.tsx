"use client";

import { useEffect, useState } from "react";

type Testimonial = {
  id: string;
  review_id: string;
  review_url: string | null;
  title: string | null;
  rating: number;
  date_of_stay: string | null;
  trip_type: string | null;
  review_text: string;
  /** Per-category sound-bite. When present, this is what we display
   *  on the carousel; otherwise we fall back to review_text. */
  excerpt: string | null;
};

type Props = {
  testimonials: Testimonial[];
  autoplayMs?: number;
};

export default function TestimonialCarousel({ testimonials, autoplayMs = 6000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (testimonials.length <= 1 || paused) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % testimonials.length);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [testimonials.length, paused, autoplayMs]);

  if (testimonials.length === 0) {
    return (
      <p className="text-center text-sm text-anamaya-charcoal/60">
        No testimonials configured for this page yet.
      </p>
    );
  }

  return (
    <div
      className="relative mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fader: stack all slides, show the active one */}
      <div className="relative min-h-[400px] sm:min-h-[360px]">
        {testimonials.map((t, i) => (
          <figure
            key={t.id}
            aria-hidden={i !== idx}
            className={`absolute inset-0 flex flex-col items-center px-4 text-center transition-opacity duration-700 ease-in-out ${
              i === idx ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {t.title && (
              <h3 className="mb-6 text-xl font-semibold leading-snug text-anamaya-olive-dark sm:text-2xl">
                &ldquo;{t.title}&rdquo;
              </h3>
            )}
            <blockquote className="text-balance text-base italic leading-relaxed text-anamaya-charcoal/80 sm:text-lg">
              &ldquo;{t.excerpt ?? t.review_text}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-sm text-anamaya-charcoal/70">
              {[t.date_of_stay, t.trip_type].filter(Boolean).join(" · ") || null}
              {t.review_url && (
                <>
                  {" "}
                  <a
                    href={t.review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-anamaya-green underline-offset-2 hover:underline"
                  >
                    View on TripAdvisor ↗
                  </a>
                </>
              )}
            </figcaption>
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/tripadvisor-5-stars.webp"
                alt={`${t.rating} out of 5 stars on TripAdvisor`}
                width={120}
                height={20}
                loading="lazy"
                decoding="async"
                className="h-5 w-auto"
              />
            </div>
          </figure>
        ))}
      </div>

      {/* Dots */}
      {testimonials.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show testimonial ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === idx ? "w-6 bg-anamaya-olive-dark" : "bg-anamaya-charcoal/30 hover:bg-anamaya-charcoal/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
