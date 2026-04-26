import type { RichBgContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";
import DecorationOverlay from "./shared/DecorationOverlay";

/** Rich text content on a branded background (color + optional image). */
export default function RichBgBlock({ content }: { content: RichBgContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const fit = content?.bg_image_fit ?? "cover";
  const bgImage = content?.bg_image_url ? `url(${content.bg_image_url})` : undefined;

  // Scale tweak applies on top of the fit mode. For cover/contain we
  // multiply the base size by the pct; for tile we just treat it as the
  // tile size directly. 100 = natural fit.
  const scalePct = Math.max(50, Math.min(200, content?.bg_image_scale_pct ?? 100));
  const bgSize =
    fit === "tile"
      ? `${scalePct}%`
      : scalePct === 100
      ? fit
      : `${scalePct}% auto`;
  const bgRepeat = fit === "tile" ? "repeat" : "no-repeat";
  const contentWidth = content?.content_width_px ?? 720;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: bg,
        backgroundImage: bgImage,
        backgroundSize: bgSize,
        backgroundPosition: "center",
        backgroundRepeat: bgRepeat,
        color,
        paddingTop: pad,
        paddingBottom: pad,
      }}
    >
      <DecorationOverlay frame={content} />
      <div className="relative mx-auto w-full px-6" style={{ maxWidth: contentWidth }}>
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: content?.html ?? "" }}
        />
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}
