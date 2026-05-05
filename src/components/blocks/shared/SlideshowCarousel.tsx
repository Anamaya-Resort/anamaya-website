"use client";

import { useEffect, useState } from "react";

/**
 * Crossfade carousel for image slideshow blocks. All slides are
 * server-rendered; this client island just toggles opacity to
 * cross-fade between them. The slides are queried via the
 * data-slideshow-carousel parent + data-slideshow-slide children
 * attributes so the SSR HTML stays semantic and parseable.
 */
export default function SlideshowCarousel({
  count,
  displaySeconds,
  fadeSeconds,
}: {
  count: number;
  displaySeconds: number;
  fadeSeconds: number;
}) {
  const [idx, setIdx] = useState(0);
  const cycleMs = (displaySeconds + fadeSeconds) * 1000;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), cycleMs);
    return () => clearInterval(t);
  }, [count, cycleMs]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      "[data-slideshow-carousel]",
    );
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>(
      "[data-slideshow-slide]",
    );
    slides.forEach((el, i) => {
      const active = i === idx;
      el.style.opacity = active ? "1" : "0";
      el.setAttribute("aria-hidden", String(!active));
    });
  }, [idx]);

  // No visible UI from this component — the carousel just drives the
  // server-rendered slides via DOM attributes.
  return null;
}
