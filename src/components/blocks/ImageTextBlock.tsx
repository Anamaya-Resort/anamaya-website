import type { ImageTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/** Two-column: image on one side, free HTML on the other. */
export default function ImageTextBlock({ content }: { content: ImageTextContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const imgPct = Math.max(10, Math.min(90, content?.image_width_pct ?? 50));
  const textPct = 100 - imgPct;
  const imgOnLeft = (content?.image_side ?? "left") === "left";
  const valign = content?.vertical_align ?? "center";
  const alignItems =
    valign === "top" ? "items-start" : valign === "bottom" ? "items-end" : "items-center";

  const gridCols = imgOnLeft
    ? `${imgPct}% ${textPct}%`
    : `${textPct}% ${imgPct}%`;

  const imageCell = (
    <div className="h-full w-full">
      {content?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.image_url}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm italic text-anamaya-charcoal/40">
          No image yet
        </div>
      )}
    </div>
  );

  const textCell = (
    <div
      className="px-8 py-6"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: content?.html ?? "" }}
    />
  );

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-6">
        <div
          className={`grid ${alignItems}`}
          style={{ gridTemplateColumns: gridCols, gap: 0 }}
        >
          {imgOnLeft ? imageCell : textCell}
          {imgOnLeft ? textCell : imageCell}
        </div>
      </div>
    </section>
  );
}
