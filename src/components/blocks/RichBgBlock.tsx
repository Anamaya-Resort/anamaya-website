import type { RichBgContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/** Rich text content on a branded background (color + optional image). */
export default function RichBgBlock({ content }: { content: RichBgContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const pad = content?.padding_y_px ?? 48;
  const fit = content?.bg_image_fit ?? "cover";
  const bgImage = content?.bg_image_url ? `url(${content.bg_image_url})` : undefined;

  const bgSize = fit === "contain" ? "contain" : fit === "tile" ? "auto" : "cover";
  const bgRepeat = fit === "tile" ? "repeat" : "no-repeat";

  return (
    <section
      className="w-full"
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
      <div
        className="mx-auto w-full max-w-[1200px] px-6"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: content?.html ?? "" }}
      />
    </section>
  );
}
