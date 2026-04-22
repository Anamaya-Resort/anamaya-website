import type { ImageOverlayContent, ImageOverlayLine } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";

/** Full-width image with up to 3 lines of independently-styled text on top. */
export default function ImageOverlayBlock({ content }: { content: ImageOverlayContent }) {
  const height = content?.height_px ?? 480;
  const overlay = (content?.overlay_opacity ?? 25) / 100;
  const align = content?.align ?? "center";
  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  return (
    <section
      className="relative w-full overflow-hidden bg-anamaya-charcoal"
      style={{ height }}
    >
      {content?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {overlay > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlay }}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative z-10 mx-auto flex h-full w-full max-w-[1200px] flex-col justify-center gap-2 px-6 ${alignClass}`}
      >
        {([content?.line_1, content?.line_2, content?.line_3] as (ImageOverlayLine | undefined)[]).map(
          (line, i) => line?.text ? <Line key={i} line={line} /> : null,
        )}
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

function Line({ line }: { line: ImageOverlayLine }) {
  const font = line.font === "body" ? "font-sans" : "font-heading";
  return (
    <div
      className={font}
      style={{
        fontSize: line.size_px ?? 20,
        fontWeight: line.bold ? 700 : 400,
        fontStyle: line.italic ? "italic" : "normal",
        color: resolveBrandColor(line.color) ?? "#ffffff",
      }}
    >
      {line.text}
    </div>
  );
}
