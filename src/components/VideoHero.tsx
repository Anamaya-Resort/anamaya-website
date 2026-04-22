"use client";

import { useEffect, type ReactNode } from "react";
import { useHeader } from "@/contexts/HeaderContext";

type Props = {
  /** YouTube video ID or embed URL — used on desktop/tablet for high quality. */
  youtubeId?: string;
  /** Self-hosted mp4 URL — used if no youtubeId, or as mobile fallback. */
  mp4Src?: string;
  /** Poster/fallback image shown before video loads. */
  poster?: string;
  /** Hero content overlaying the video (heading, CTAs, etc.) */
  children?: ReactNode;
  /** Tailwind height classes. Default: 80vh (matches v2). */
  heightClassName?: string;
  /** Darkening overlay intensity (0-100). Default: 20 for readability. */
  overlayOpacity?: number;
};

// Build a YouTube embed URL that behaves like a looping muted background video.
function youtubeEmbedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,          // required for loop to work on the same video
    controls: "0",
    showinfo: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    disablekb: "1",
    iv_load_policy: "3",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export default function VideoHero({
  youtubeId,
  mp4Src,
  poster,
  children,
  heightClassName = "h-[80vh]",
  overlayOpacity = 20,
}: Props) {
  const { setOverVideo } = useHeader();

  useEffect(() => {
    setOverVideo(true);
    return () => setOverVideo(false);
  }, [setOverVideo]);

  return (
    <section className={`relative w-full overflow-hidden ${heightClassName}`}>
      {youtubeId ? (
        <>
          {/* Desktop/tablet: YouTube iframe — high quality, no bandwidth cost to Supabase */}
          <div className="absolute inset-0 hidden overflow-hidden md:block">
            <iframe
              src={youtubeEmbedUrl(youtubeId)}
              title="Hero video"
              allow="autoplay; encrypted-media"
              aria-hidden="true"
              // Scale up so the YouTube iframe's letterboxing is cropped off
              className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
            />
          </div>
          {/* Mobile: mp4 fallback (shown below md breakpoint) */}
          {mp4Src && (
            <video
              className="absolute inset-0 h-full w-full object-cover md:hidden"
              src={mp4Src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            />
          )}
        </>
      ) : mp4Src ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={mp4Src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ) : null}

      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity / 100 }}
        aria-hidden="true"
      />
      {children && (
        <div className="relative z-10 flex h-full items-center justify-center px-4 text-center text-white">
          {children}
        </div>
      )}
    </section>
  );
}
