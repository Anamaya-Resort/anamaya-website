"use client";

import { useState, useCallback, useEffect } from "react";
import type { GalleryContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Image gallery — uniform grid, masonry, or a horizontal-scroll carousel.
 * Lightbox is on by default; click an image to view full-size with arrow
 * keys / swipe to cycle. Works for retreat photo galleries, room photos,
 * teacher headshot rolls, etc.
 */
export default function GalleryBlock({ content }: { content: GalleryContent }) {
  const images = content?.images ?? [];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const layout = content?.layout ?? "grid";
  const cols = content?.columns ?? 3;
  const lightbox = content?.lightbox !== false;
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const pad = content?.padding_y_px ?? 64;

  const close = useCallback(() => setActiveIdx(null), []);
  const next = useCallback(
    () => setActiveIdx((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );
  const prev = useCallback(
    () => setActiveIdx((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (activeIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, close, next, prev]);

  if (images.length === 0) return null;

  return (
    <section className="w-full" style={{ backgroundColor: bg, paddingTop: pad, paddingBottom: pad }}>
      <div className="mx-auto w-full max-w-[1400px] px-6">
        {content?.heading && (
          <h2 className="mb-8 text-center font-heading text-3xl">{content.heading}</h2>
        )}

        {layout === "carousel" ? (
          <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:thin]">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => lightbox && setActiveIdx(i)}
                className="flex-shrink-0"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  width={img.width}
                  height={img.height}
                  className="h-64 w-auto rounded object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : layout === "masonry" ? (
          <div
            className="gap-3"
            style={{ columnCount: cols, columnGap: "0.75rem" }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => lightbox && setActiveIdx(i)}
                className="mb-3 block w-full break-inside-avoid"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  width={img.width}
                  height={img.height}
                  className="w-full rounded"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => lightbox && setActiveIdx(i)}
                className="aspect-square overflow-hidden rounded"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && activeIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            ‹
          </button>
          <img
            src={images[activeIdx].url}
            alt={images[activeIdx].alt ?? ""}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Next"
          >
            ›
          </button>
          {images[activeIdx].caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/60 px-4 py-2 text-sm text-white">
              {images[activeIdx].caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
