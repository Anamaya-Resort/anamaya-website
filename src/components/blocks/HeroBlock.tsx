"use client";

import type { HeroContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Hero With Video: optional top band, video, optional bottom band.
 * Each band has its own color + centered text. Video is either a
 * YouTube embed or an uploaded MP4.
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

function extractYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}
