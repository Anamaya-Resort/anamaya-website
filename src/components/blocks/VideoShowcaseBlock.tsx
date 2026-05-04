import type { VideoShowcaseContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";
import YouTubeFacade from "./shared/YouTubeFacade";

/** Video on a solid background with optional titles above + below. */
export default function VideoShowcaseBlock({ content }: { content: VideoShowcaseContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const pad = content?.padding_y_px ?? 48;
  const maxW = content?.video_max_width_px ?? 800;

  const source = content?.video_source ?? "youtube";
  const youtubeId = content?.youtube_url ? extractYoutubeId(content.youtube_url) : null;

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, paddingTop: pad, paddingBottom: pad }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 text-center">
        {content?.title_top && (
          <TitleLine
            text={content.title_top}
            font={content.title_top_font ?? "heading"}
            size={content.title_top_size_px ?? 32}
            color={content.title_top_color}
            bold={content.title_top_bold}
            italic={content.title_top_italic}
          />
        )}
        <div className="mx-auto my-6" style={{ maxWidth: maxW }}>
          {source === "upload" && content?.video_url ? (
            <video
              src={content.video_url}
              poster={content.video_poster_url}
              controls
              playsInline
              className="aspect-video w-full bg-black object-cover"
            />
          ) : youtubeId ? (
            <div className="aspect-video w-full bg-black">
              <YouTubeFacade
                videoId={youtubeId}
                title={content?.title_top ?? "Video"}
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-zinc-100 text-sm italic text-anamaya-charcoal/50">
              No video yet
            </div>
          )}
        </div>
        {content?.title_bottom && (
          <TitleLine
            text={content.title_bottom}
            font={content.title_bottom_font ?? "body"}
            size={content.title_bottom_size_px ?? 18}
            color={content.title_bottom_color}
            bold={content.title_bottom_bold}
            italic={content.title_bottom_italic}
          />
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function TitleLine({
  text,
  font,
  size,
  color,
  bold,
  italic,
}: {
  text: string;
  font: "body" | "heading";
  size: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <div
      className={font === "body" ? "font-sans" : "font-heading"}
      style={{
        fontSize: size,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? "italic" : "normal",
        color: resolveBrandColor(color) ?? undefined,
      }}
    >
      {text}
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
