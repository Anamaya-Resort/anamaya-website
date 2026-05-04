"use client";

import { useState } from "react";

/**
 * Click-to-load YouTube facade. Renders a static thumbnail + play button
 * until the user clicks, at which point the real <iframe> mounts with
 * autoplay enabled. Lighthouse never sees YouTube's ~1.5 MB of player JS
 * during initial-load measurements because the iframe simply isn't in
 * the DOM. UX is identical to the standard embed (one click to start).
 *
 * For above-the-fold autoplay-required heroes, prefer uploading a real
 * MP4 to Supabase via the Hero block's "Upload video" path instead —
 * a click facade can't preserve autoplay.
 */
export default function YouTubeFacade({
  videoId,
  title = "Video",
  className,
}: {
  videoId: string;
  title?: string;
  className?: string;
}) {
  const [activated, setActivated] = useState(false);

  if (activated) {
    // YouTube embed parameters chosen to strip as much chrome as the
    // free embed allows: no related videos, no annotations, no captions
    // by default, no keyboard hotkey overlay, modest YouTube branding.
    // Standard play/pause/seek controls remain because the user
    // explicitly asked for those. Note: the "Watch on YouTube" tag
    // that appears centred-bottom on pause is part of YouTube's
    // attribution requirement and cannot be removed via parameters —
    // for fully chrome-free playback, upload an MP4 via the block's
    // upload path instead (renders a native <video controls>).
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",              // no related videos
      modestbranding: "1",   // smaller YouTube logo
      playsinline: "1",      // inline on iOS
      iv_load_policy: "3",   // hide annotations
      cc_load_policy: "0",   // captions off by default
      disablekb: "1",        // disable keyboard hotkeys
    });
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={className ?? "h-full w-full"}
      />
    );
  }

  // maxresdefault.jpg isn't always available (older YouTube uploads),
  // so fall back to hqdefault.jpg via onError. Both are served from
  // i.ytimg.com (not the player domain) and don't trigger any tracking
  // or JS download.
  const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      aria-label={`Play video: ${title}`}
      className={`group relative block h-full w-full cursor-pointer overflow-hidden bg-black ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img.src !== fallback) img.src = fallback;
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/30"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 shadow-xl transition-transform group-hover:scale-110 sm:h-20 sm:w-20"
      >
        <svg
          viewBox="0 0 24 24"
          width="36"
          height="36"
          className="ml-1 fill-white"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}
