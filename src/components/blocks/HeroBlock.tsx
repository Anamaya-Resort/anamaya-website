"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroContent } from "@/types/blocks";
import { useHeader } from "@/contexts/HeaderContext";

export default function HeroBlock({ content }: { content: HeroContent }) {
  const { setOverVideo } = useHeader();
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setOverVideo(true);
    return () => setOverVideo(false);
  }, [setOverVideo]);

  useEffect(() => {
    const schedule =
      (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600));
    const cancel =
      (window as any).cancelIdleCallback ?? ((id: number) => clearTimeout(id));
    const id = schedule(() => setVideoReady(true), { timeout: 1500 });
    return () => cancel(id);
  }, []);

  const height = content.height_vh ?? 80;
  const overlayOpacity = (content.overlay_opacity ?? 20) / 100;

  return (
    <section
      className="relative w-full overflow-hidden bg-anamaya-charcoal"
      style={{ height: `${height}vh` }}
    >
      {content.video_poster_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.video_poster_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      )}
      {!content.video_poster_url && content.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      )}

      {videoReady && content.video_youtube_id && (
        <div className="absolute inset-0 hidden overflow-hidden md:block">
          <iframe
            src={`https://www.youtube.com/embed/${content.video_youtube_id}?autoplay=1&mute=1&loop=1&playlist=${content.video_youtube_id}&controls=0&modestbranding=1&rel=0&playsinline=1`}
            title="Hero video"
            allow="autoplay; encrypted-media"
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}

      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
        {content.title && (
          <h1 className="text-balance text-4xl font-semibold leading-tight drop-shadow sm:text-6xl">
            {content.title}
          </h1>
        )}
        {content.subtitle && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 drop-shadow sm:text-xl">
            {content.subtitle}
          </p>
        )}
        {content.cta?.href && content.cta?.label && (
          <Link
            href={content.cta.href}
            className="mt-8 rounded-full bg-anamaya-green px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            {content.cta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
