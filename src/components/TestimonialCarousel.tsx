"use client";

import { useEffect, useState } from "react";
import { TripAdvisorRating } from "./TripAdvisorRating";

type Testimonial = {
  id: string;
  author: string;
  source: string | null;
  source_date: string | null;
  rating: number;
  headline: string | null;
  quote: string;
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
      <div className="relative min-h-[360px] sm:min-h-[320px]">
        {testimonials.map((t, i) => (
          <figure
            key={t.id}
            aria-hidden={i !== idx}
            className={`absolute inset-0 flex flex-col items-center px-4 text-center transition-opacity duration-700 ease-in-out ${
              i === idx ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {t.headline && (
              <h3 className="mb-6 text-xl font-semibold leading-snug text-anamaya-olive-dark sm:text-2xl">
                &ldquo;{t.headline}&rdquo;
              </h3>
            )}
            <blockquote className="text-balance text-base italic leading-relaxed text-anamaya-charcoal/80 sm:text-lg">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-sm text-anamaya-charcoal/70">
              — <span className="font-medium">{t.author}</span>
              {t.source_date && <span className="text-anamaya-charcoal/50">, {t.source_date}</span>}
            </figcaption>
            <div className="mt-4">
              <TripAdvisorRating
                rating={t.rating ?? 5}
                showLogo={(t.source ?? "").toLowerCase().includes("trip")}
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
