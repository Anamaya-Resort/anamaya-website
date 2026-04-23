import type { ImageTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { flipTransform } from "@/components/admin/blocks/ImageTransformFieldset";
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

  // Image scale — 10-100% of the image column. Always fits; never crops.
  const scalePct = Math.max(10, Math.min(100, content?.image_scale_pct ?? 100));

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
          style={{
            maxWidth: `${scalePct}%`,
            maxHeight: `${scalePct}%`,
            width: "auto",
            height: "auto",
            objectFit: "contain",
            transform: flip,
          }}
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
