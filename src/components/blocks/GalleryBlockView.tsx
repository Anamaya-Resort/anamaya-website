"use client";

import { useState } from "react";
import type { GalleryContent, GalleryImage } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import Lightbox from "@/components/Lightbox";
import DecorationOverlay from "./shared/DecorationOverlay";
import LayoutWidths from "./shared/LayoutWidths";

/**
 * Image gallery — uniform grid, masonry, or a horizontal-scroll carousel.
 * The presentation half: it is handed a finished list of images and
 * knows nothing about where they came from. GalleryBlock (the server
 * wrapper) decides that — a gallery code from AnamayaOS, or the images
 * pasted into the block.
 * Lightbox is on by default; click an image to view full-size with arrow
 * keys / swipe to cycle. Works for retreat photo galleries, room photos,
 * teacher headshot rolls, etc.
 */
// Admin block-preview only: same-origin photos so an empty gallery still has
// visible tiles (an external URL here would taint the snapshot canvas).
export const SAMPLE_IMAGES: GalleryImage[] = [
  { url: "/yoga_shala.webp", alt: "" },
  { url: "/yoga_retreat_costarica.webp", alt: "" },
  { url: "/costarica_wellness_retreats.webp", alt: "" },
  { url: "/yoga_shala.webp", alt: "" },
  { url: "/yoga_retreat_costarica.webp", alt: "" },
  { url: "/costarica_wellness_retreats.webp", alt: "" },
];

/**
 * Marks a tile as footage. A gallery can hold video as well as
 * photographs, and a poster frame is indistinguishable from a still
 * without it — you would click expecting a photo and get a player.
 */
function PlayBadge() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
    >
      <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

export default function GalleryBlockView({
  content,
  preview,
  overrideImages,
}: {
  content: GalleryContent;
  /** Resolved gallery contents, when the block names a gallery code. */
  overrideImages?: GalleryImage[];
  /** Admin block-preview only: render sample photos when the gallery is
   *  empty so the design shows. Never set on public render paths. */
  preview?: boolean;
}) {
  const images =
    overrideImages ??
    (preview && (content?.images ?? []).length === 0
      ? SAMPLE_IMAGES
      : content?.images ?? []);
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
                className="relative flex-shrink-0"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  width={img.width}
                  height={img.height}
                  className="h-64 w-auto rounded object-cover"
                  loading="lazy"
                />
                {img.video_url && <PlayBadge />}
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
                className="relative mb-3 block w-full break-inside-avoid"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  width={img.width}
                  height={img.height}
                  className="w-full rounded"
                  loading="lazy"
                />
                {img.video_url && <PlayBadge />}
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
                className="relative aspect-square overflow-hidden rounded"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                />
                {img.video_url && <PlayBadge />}
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
          video_url: im.video_url ?? null,
        }))}
        index={lightbox ? activeIdx : null}
        onClose={() => setActiveIdx(null)}
        onIndex={setActiveIdx}
      />
    </section>
  );
}
