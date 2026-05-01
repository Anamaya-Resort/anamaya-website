import type { ImageOverlayContent, ImageOverlayLine } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { flipTransform } from "@/lib/flip-transform";
import CtaButton from "./shared/CtaButton";

/** Full-width image with up to 3 lines of independently-styled text on top. */
export default function ImageOverlayBlock({ content }: { content: ImageOverlayContent }) {
  const height = content?.height_px ?? 480;
  const overlay = (content?.overlay_opacity ?? 25) / 100;
  const align = content?.align ?? "center";
  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
  // Empty/undefined means no background (transparent) — lets transparent
  // images sit over the page's own backdrop. Otherwise a brand token or
  // a raw hex; the old hard-coded anamaya-charcoal is gone.
  const bg = content?.bg_color ? resolveBrandColor(content.bg_color) : "transparent";

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height, backgroundColor: bg }}
    >
      {content?.image_url && (() => {
        // ≤100%: width/height % of the section (shrinks to fit, never crops).
        // >100%: fill section naturally then CSS scale up — each +2 step is
        // a true 2% zoom; section's overflow-hidden clips the edges.
        const scalePct = Math.max(10, Math.min(200, content?.image_scale_pct ?? 100));
        const fitsInside = scalePct <= 100;
        const flip = flipTransform(content?.image_flip_x, content?.image_flip_y);
        const altText = content?.image_alt ?? "";
        const scaleTransform = !fitsInside ? `scale(${scalePct / 100})` : undefined;
        const combinedTransform = [flip, scaleTransform].filter(Boolean).join(" ") || undefined;
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.image_url}
              alt={altText}
              aria-hidden={altText ? undefined : "true"}
              className={
                content?.image_fit === "cover" ? "object-cover" : "object-contain"
              }
              style={
                fitsInside
                  ? { width: `${scalePct}%`, height: `${scalePct}%`, transform: flip }
                  : { width: "100%", height: "100%", transform: combinedTransform }
              }
            />
          </div>
        );
      })()}
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
