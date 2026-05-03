import type { SmallFormOverImageContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import SereenlyForm from "../SereenlyForm";

const DEFAULT_BANNER_BG = "#444444";   // anamaya-charcoal
const DEFAULT_CARD_BG = "#fbfbfb";     // anamaya-cream
// anamaya.com's "Newsletter Home Page" form (first/last + phone + email).
// Used as a render-time fallback when the block content has no form_id
// set yet, so freshly-created blocks render the form immediately
// instead of looking broken until the editor pastes in an id.
const DEFAULT_FORM_ID = "3VbotiuGfLgRUdIpi2ro";

/**
 * Banner with an embedded Sereenly form sitting inside a centred card.
 * See type docstring for the layered structure. The card itself is
 * always 100 % opaque (its background colour paints first); only the
 * card's background IMAGE can be made translucent or blended on top
 * of that colour.
 */
export default function SmallFormOverImageBlock({
  content,
}: {
  content: SmallFormOverImageContent;
}) {
  const c = content ?? {};

  // Banner
  const bannerHeight = clamp(c.banner_height_px ?? 600, 200, 1600);
  const bannerBg = resolveBrandColor(c.bg_color) ?? DEFAULT_BANNER_BG;
  const bannerImageOpacity = clamp(c.bg_image_opacity ?? 100, 0, 100) / 100;
  const bannerImageBlend = c.bg_image_blend_mode ?? "normal";

  // Card size
  const cardWidthValue = clamp(c.card_width_value ?? 50, 1, 100000);
  const cardWidthUnit: "pct" | "px" = c.card_width_unit ?? "pct";
  const cardHeightValue = clamp(c.card_height_value ?? 80, 1, 100000);
  const cardHeightUnit: "pct" | "px" = c.card_height_unit ?? "pct";
  const cardWidth = cardWidthUnit === "pct" ? `${cardWidthValue}%` : `${cardWidthValue}px`;
  const cardHeight = cardHeightUnit === "pct" ? `${cardHeightValue}%` : `${cardHeightValue}px`;

  // Card alignment
  const halign = c.card_horizontal_align ?? "center";
  const valign = c.card_vertical_align ?? "center";
  const justify =
    halign === "left" ? "justify-start"
    : halign === "right" ? "justify-end"
    : "justify-center";
  const items =
    valign === "top" ? "items-start"
    : valign === "bottom" ? "items-end"
    : "items-center";

  // Card visuals
  const cardBg = resolveBrandColor(c.card_bg_color) ?? DEFAULT_CARD_BG;
  const cardImageOpacity = clamp(c.card_bg_image_opacity ?? 100, 0, 100) / 100;
  const cardImageBlend = c.card_bg_image_blend_mode ?? "normal";
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 60);
  const cardPadding = clamp(c.card_padding_px ?? 32, 0, 200);

  // Heading text
  const headingFont = c.heading_font === "body" ? "font-sans" : "font-heading";
  const subheadingFont = c.subheading_font === "heading" ? "font-heading" : "font-sans";

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bannerBg, height: bannerHeight }}
    >
      {c.bg_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${c.bg_image_url})`,
            opacity: bannerImageOpacity,
            mixBlendMode: bannerImageBlend,
          }}
          aria-label={c.bg_image_alt ?? undefined}
          role={c.bg_image_alt ? "img" : undefined}
          aria-hidden={c.bg_image_alt ? undefined : "true"}
        />
      )}

      <div className={`relative flex h-full w-full px-6 py-6 ${justify} ${items}`}>
        <div
          className="relative max-h-full max-w-full overflow-hidden"
          style={{
            width: cardWidth,
            height: cardHeight,
            backgroundColor: cardBg,
            borderRadius: cardRadius,
          }}
        >
          {c.card_bg_image_url && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${c.card_bg_image_url})`,
                opacity: cardImageOpacity,
                mixBlendMode: cardImageBlend,
              }}
              aria-label={c.card_bg_image_alt ?? undefined}
              role={c.card_bg_image_alt ? "img" : undefined}
              aria-hidden={c.card_bg_image_alt ? undefined : "true"}
            />
          )}

          <div
            className="relative flex h-full w-full flex-col overflow-y-auto"
            style={{ padding: cardPadding }}
          >
            {/*
              `my-auto` on a single flex-column child absorbs the
              remaining vertical space equally above and below, which
              vertically centres the heading + subheading + form
              regardless of the iframe's eventual height. When the
              content is taller than the card the auto margins collapse
              to zero and the parent's overflow-y-auto handles scroll.
            */}
            <div className="my-auto w-full">
              {c.heading && (
                <h2
                  className={`${headingFont} mb-2 text-center`}
                  style={{
                    fontSize: c.heading_size_px ?? 32,
                    color: resolveBrandColor(c.heading_color) ?? undefined,
                    fontWeight: c.heading_bold ? 700 : 600,
                    fontStyle: c.heading_italic ? "italic" : "normal",
                    lineHeight: 1.15,
                  }}
                >
                  {c.heading}
                </h2>
              )}
              {c.subheading && (
                <p
                  className={`${subheadingFont} mb-4 text-center`}
                  style={{
                    fontSize: c.subheading_size_px ?? 16,
                    color: resolveBrandColor(c.subheading_color) ?? undefined,
                    lineHeight: 1.5,
                  }}
                >
                  {c.subheading}
                </p>
              )}
              <SereenlyForm
                formId={c.form_id || DEFAULT_FORM_ID}
                title={c.form_name ?? "Newsletter Form"}
                formName={c.form_name ?? "Newsletter Form"}
                initialHeight={c.form_height_px ?? 460}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
