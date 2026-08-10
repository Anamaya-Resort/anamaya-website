"use client";

import { useState } from "react";
import Lightbox, { type LightboxImage } from "./Lightbox";

/**
 * Wraps a single photo so clicking it opens the shared site-wide Lightbox.
 * Use anywhere a solo image should be enlargeable (hero, image blocks, an
 * inline body photo). For a set of photos use the gallery block, which drives
 * the same Lightbox.
 */
export default function ZoomableImage({
  src,
  alt,
  caption,
  className,
  width,
  height,
  loading = "lazy",
}: {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}) {
  const [open, setOpen] = useState(false);
  const images: LightboxImage[] = [{ url: src, alt, caption }];

  return (
    <>
      <button
        type="button"
        className="group block w-full cursor-zoom-in border-0 bg-transparent p-0"
        onClick={() => setOpen(true)}
        aria-label={alt ? `View full size: ${alt}` : "View full size"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          width={width}
          height={height}
          loading={loading}
          className={className}
        />
      </button>
      <Lightbox
        images={images}
        index={open ? 0 : null}
        onClose={() => setOpen(false)}
        onIndex={() => {}}
      />
    </>
  );
}
