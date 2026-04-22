"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useHeader } from "@/contexts/HeaderContext";

type Props = {
  /** YouTube video ID for desktop/tablet. */
  youtubeId?: string;
  /** Self-hosted mp4 — mobile fallback or whole-page fallback if no YT. */
  mp4Src?: string;
  /** Static poster shown instantly at page load. Replaced by the video once ready. */
  poster?: string;
  /** Hero content overlaying the video (heading, CTAs, etc.) */
  children?: ReactNode;
  /** Tailwind height classes. Default: 80vh (matches v2). */
  heightClassName?: string;
  /** Darkening overlay intensity (0-100). Default: 20. */
  overlayOpacity?: number;
};

function youtubeEmbedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,
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

  // Defer iframe/mp4 injection so it's off the critical path.
  // The poster paints immediately; the real video fades in a beat later.
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setOverVideo(true);
    return () => setOverVideo(false);
  }, [setOverVideo]);

  useEffect(() => {
    // Wait for the browser to be idle (or 600ms max) before attaching video.
    const schedule =
      (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600));
    const cancel =
      (window as any).cancelIdleCallback ?? ((id: number) => clearTimeout(id));
    const id = schedule(
      () => setVideoReady(true),
      { timeout: 1500 },
    );
    return () => cancel(id);
  }, []);

  return (
    <section className={`relative w-full overflow-hidden bg-anamaya-charcoal ${heightClassName}`}>
      {/* Static poster — always present underneath so we never flash empty.
          Once the video fades in, the poster is behind it (not unmounted). */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      )}

      {videoReady && youtubeId && (
        <div
          className="absolute inset-0 hidden overflow-hidden md:block"
          // Fade the YT iframe in on top of the poster
          style={{ animation: "fadeIn 800ms ease-in 200ms forwards", opacity: 0 }}
        >
          <iframe
            src={youtubeEmbedUrl(youtubeId)}
            title="Hero video"
            allow="autoplay; encrypted-media"
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}

      {videoReady && mp4Src && (
        <video
          className={`absolute inset-0 h-full w-full object-cover ${youtubeId ? "md:hidden" : ""}`}
          src={mp4Src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          style={{ animation: "fadeIn 800ms ease-in forwards", opacity: 0 }}
        />
      )}

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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
