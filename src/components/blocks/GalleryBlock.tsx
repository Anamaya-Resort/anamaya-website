"use client";

import { useState } from "react";
import type { GalleryContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import Lightbox from "@/components/Lightbox";
import DecorationOverlay from "./shared/DecorationOverlay";
import LayoutWidths from "./shared/LayoutWidths";

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

  if (images.length === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, paddingTop: pad, paddingBottom: pad }}
    >
      <DecorationOverlay frame={content} />
      <LayoutWidths
        content={content}
        defaultMaxContentPx={content?.content_width_px ?? 1400}
        className="relative"
      >
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
      </LayoutWidths>

      <Lightbox
        images={images.map((im) => ({
          url: im.url,
          alt: im.alt ?? null,
          caption: im.caption ?? null,
        }))}
        index={lightbox ? activeIdx : null}
        onClose={() => setActiveIdx(null)}
        onIndex={setActiveIdx}
      />
    </section>
  );
}
