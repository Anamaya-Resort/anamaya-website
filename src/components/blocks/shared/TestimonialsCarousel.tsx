"use client";

import { useEffect, useState } from "react";
import type { Testimonial } from "@/lib/testimonials";

/**
 * Crossfade carousel for the Testimonials block. All slides are
 * server-rendered into the DOM (each as a `<figure>`) — the active
 * one has opacity 1, the others opacity 0. CSS handles the fade.
 *
 * Timing: each slide stays fully visible for `displayMs`, then both
 * the outgoing slide fades out and the incoming one fades in over
 * `fadeMs` (CSS transition). The cycle interval is displayMs + fadeMs.
 */
export default function TestimonialsCarousel({
  count,
  displaySeconds = 4,
  fadeSeconds = 2,
}: {
  count: number;
  displaySeconds?: number;
  fadeSeconds?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const cycleMs = (displaySeconds + fadeSeconds) * 1000;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), cycleMs);
    return () => clearInterval(t);
  }, [count, paused, cycleMs]);

  // Apply active/hidden classes to slide elements server-rendered as
  // siblings inside `[data-testimonials-carousel]`. We don't render the
  // slides here — the server already did that, and we just toggle
  // visibility via classes so the SSR HTML stays parseable for SEO/GEO.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-testimonials-carousel]");
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-testimonials-slide]");
    slides.forEach((el, i) => {
      const active = i === idx;
      el.style.opacity = active ? "1" : "0";
      el.style.pointerEvents = active ? "auto" : "none";
      el.setAttribute("aria-hidden", String(!active));
    });
  }, [idx]);

  // Pause on hover for accessibility (don't auto-advance while user
  // is reading). Attaches handlers to the same root.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-testimonials-carousel]");
    if (!root) return;
    const enter = () => setPaused(true);
    const leave = () => setPaused(false);
    root.addEventListener("mouseenter", enter);
    root.addEventListener("mouseleave", leave);
    return () => {
      root.removeEventListener("mouseenter", enter);
      root.removeEventListener("mouseleave", leave);
    };
  }, []);

  // Render dots so the user has a visual progress indicator and can
  // jump to a slide.
  return (
    <div className="mt-6 flex justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Show testimonial ${i + 1}`}
          onClick={() => setIdx(i)}
          className={`h-2 rounded-full transition-all ${
            i === idx ? "w-6 bg-anamaya-olive-dark" : "w-2 bg-anamaya-charcoal/30 hover:bg-anamaya-charcoal/50"
          }`}
        />
      ))}
    </div>
  );
}

// Re-export for type safety in the parent block (avoids repeating the type).
export type { Testimonial };
