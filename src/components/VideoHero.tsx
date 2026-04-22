"use client";

import { useEffect, type ReactNode } from "react";
import { useHeader } from "@/contexts/HeaderContext";

type Props = {
  /** Full URL of the background video (mp4 or webm). */
  videoSrc: string;
  /** Poster/fallback image shown before video loads. */
  poster?: string;
  /** Hero content overlaying the video (heading, CTAs, etc.) */
  children?: ReactNode;
  /** Tailwind height classes. Default: full viewport. */
  heightClassName?: string;
  /** Darkening overlay intensity (0-100). Default: 20 for readability. */
  overlayOpacity?: number;
};

export default function VideoHero({
  videoSrc,
  poster,
  children,
  heightClassName = "h-screen",
  overlayOpacity = 20,
}: Props) {
  const { setOverVideo } = useHeader();

  // Tell the Header to go transparent while this hero is mounted
  useEffect(() => {
    setOverVideo(true);
    return () => setOverVideo(false);
  }, [setOverVideo]);

  return (
    <section className={`relative w-full overflow-hidden ${heightClassName}`}>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
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
