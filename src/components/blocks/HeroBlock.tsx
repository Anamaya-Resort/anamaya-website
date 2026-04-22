"use client";

import { useEffect, useState } from "react";
import type { HeroContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Hero With Video: optional top band, video, optional bottom band.
 * Each band has its own color + centered text. Video is either a
 * YouTube embed or an uploaded MP4.
 *
 * Two display modes:
 * - "aspect" (default): 16:9 inline player with controls.
 * - "cover": full-viewport background, autoplay/muted/loop, poster
 *   shown instantly while the video loads. Matches the homepage hero.
 */
export default function HeroBlock({ content }: { content: HeroContent }) {
  const top = content?.top;
  const bottom = content?.bottom;
  return (
    <section className="w-full">
      {top?.enabled && <Band band={top} />}
      <VideoStage content={content} />
      {bottom?.enabled && <Band band={bottom} />}
    </section>
  );
}

function Band({ band }: { band: NonNullable<HeroContent["top"]> }) {
  const bg = resolveBrandColor(band.bg_color) ?? "transparent";
  const color = resolveBrandColor(band.text_color) ?? "#444444";
  const fontClass = band.text_font === "body" ? "font-sans" : "font-heading";
  return (
    <div
      className={`${fontClass} flex w-full items-center justify-center px-6 text-center`}
      style={{
        backgroundColor: bg,
        minHeight: band.height_px ?? 100,
        color,
        fontSize: band.text_size_px ?? 18,
        fontWeight: band.text_bold ? 700 : 400,
        fontStyle: band.text_italic ? "italic" : "normal",
      }}
    >
      {band.text && <div className="max-w-4xl whitespace-pre-wrap">{band.text}</div>}
    </div>
  );
}

function VideoStage({ content }: { content: HeroContent }) {
  const fit = content?.fit ?? "aspect";
  return fit === "cover" ? <CoverStage content={content} /> : <AspectStage content={content} />;
}

/** 16:9 inline player — YouTube with controls, HTML5 with controls. */
function AspectStage({ content }: { content: HeroContent }) {
  const source = content?.video_source ?? "youtube";
  if (source === "upload" && content?.video_url) {
    return (
      <video
        src={content.video_url}
        poster={content.video_poster_url}
        controls
        playsInline
        className="aspect-video w-full bg-black object-cover"
      />
    );
  }
  if (source === "youtube" && content?.youtube_url) {
    const id = extractYoutubeId(content.youtube_url);
    if (!id) return null;
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`}
          title="Hero video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-video w-full items-center justify-center bg-zinc-200 text-sm italic text-anamaya-charcoal/50">
      No video yet
    </div>
  );
}

/**
 * Full-viewport background: poster paints instantly, video fades in once
 * idle. YouTube is hidden on mobile (saves bandwidth — the poster alone
 * covers the viewport). HTML5 mp4 auto-plays on all sizes.
 */
function CoverStage({ content }: { content: HeroContent }) {
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const schedule =
      (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: unknown) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const cancel =
      (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback ??
      ((id: number) => window.clearTimeout(id));
    const id = schedule(() => setVideoReady(true), { timeout: 1500 });
    return () => cancel(id);
  }, []);

  const heightVh = content.height_vh ?? 80;
  const overlay = (content.overlay_opacity ?? 0) / 100;
  const source = content.video_source ?? "youtube";
  const youtubeId = content.youtube_url ? extractYoutubeId(content.youtube_url) : null;

  return (
    <section
      className="relative w-full overflow-hidden bg-anamaya-charcoal"
      style={{ height: `${heightVh}vh` }}
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

      {videoReady && source === "youtube" && youtubeId && (
        <div
          className="absolute inset-0 hidden overflow-hidden md:block"
          style={{ animation: "heroFadeIn 800ms ease-in 200ms forwards", opacity: 0 }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3`}
            title="Hero video"
            allow="autoplay; encrypted-media"
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}

      {videoReady && source === "upload" && content.video_url && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={content.video_url}
          poster={content.video_poster_url}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          style={{ animation: "heroFadeIn 800ms ease-in forwards", opacity: 0 }}
        />
      )}

      {overlay > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlay }}
          aria-hidden="true"
        />
      )}

      <style jsx>{`
        @keyframes heroFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

function extractYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}
