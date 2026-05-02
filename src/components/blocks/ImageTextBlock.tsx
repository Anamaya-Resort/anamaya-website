import type { ImageTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { flipTransform } from "@/lib/flip-transform";
import CtaButton from "./shared/CtaButton";

/** Two-column: image on one side, free HTML on the other. */
export default function ImageTextBlock({ content }: { content: ImageTextContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const imgPct = Math.max(10, Math.min(90, content?.image_width_pct ?? 50));
  const textPct = 100 - imgPct;
  const imgOnLeft = (content?.image_side ?? "left") === "left";
  const valign = content?.vertical_align ?? "center";
  const alignItems =
    valign === "top" ? "items-start" : valign === "bottom" ? "items-end" : "items-center";

  // Container dimensions — new model. If container_height_px is set, the
  // section is that tall and padding_y is unused; otherwise fall back to
  // the legacy padding_y_px default for content-sized sections.
  const containerWidth = content?.container_width_px ?? 1400;
  const containerHeightPx = content?.container_height_px ?? 0;
  const hasFixedHeight = containerHeightPx > 0;
  const padY = hasFixedHeight ? 0 : content?.padding_y_px ?? 48;

  // Image scale — 10-200%. At ≤100 the image is constrained to scalePct%
  // of the column (never crops). At >100 it's rendered at natural size then
  // CSS-scaled up, so +2% = a true 2% zoom; parent overflow-hidden clips.
  const scalePct = Math.max(10, Math.min(200, content?.image_scale_pct ?? 100));
  const fitsInside = scalePct <= 100;

  const gridCols = imgOnLeft
    ? `${imgPct}% ${textPct}%`
    : `${textPct}% ${imgPct}%`;

  const altText = content?.image_alt ?? "";
  const flip = flipTransform(content?.image_flip_x, content?.image_flip_y);
  const imageCell = (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {content?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt={altText}
          aria-hidden={altText ? undefined : "true"}
          style={
            fitsInside
              ? {
                  maxWidth: `${scalePct}%`,
                  maxHeight: `${scalePct}%`,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  transform: flip,
                }
              : {
                  // >100% — natural size then CSS-scaled up so each +2 step
                  // is a true 2% zoom. Parent overflow-hidden clips the edges.
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  transform: [flip, `scale(${scalePct / 100})`]
                    .filter(Boolean)
                    .join(" "),
                }
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm italic text-anamaya-charcoal/40">
          No image yet
        </div>
      )}
    </div>
  );

  const textCell = (
    <div className="px-8 py-6">
      <div
        className="prose-anamaya prose-anamaya-block"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: content?.html ?? "" }}
      />
      <CtaButton cta={content ?? {}} />
    </div>
  );

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: bg,
        color,
        paddingTop: padY,
        paddingBottom: padY,
        minHeight: hasFixedHeight ? containerHeightPx : undefined,
      }}
    >
      <div
        className="mx-auto w-full px-6"
        style={{ maxWidth: containerWidth }}
      >
        <div
          className={`grid ${alignItems}`}
          style={{
            gridTemplateColumns: gridCols,
            gap: 0,
            height: hasFixedHeight ? containerHeightPx : undefined,
          }}
        >
          {imgOnLeft ? imageCell : textCell}
          {imgOnLeft ? textCell : imageCell}
        </div>
      </div>
    </section>
  );
}
