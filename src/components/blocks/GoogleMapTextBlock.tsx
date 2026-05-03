import type { GoogleMapTextContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import CtaButton from "./shared/CtaButton";

// Anamaya Resort & Retreat Center on Google Maps. Coords from the
// place's own URL (https://www.google.com/maps/place/Anamaya+Resort/...).
const DEFAULT_LAT = 9.651369;
const DEFAULT_LNG = -85.0736541;
const DEFAULT_ZOOM = 16;

/**
 * Two-column section: embedded Google Map on one side, free HTML on
 * the other. Sibling of ImageTextBlock — same layout controls — with
 * the image cell replaced by an interactive Map iframe.
 *
 * The embed uses the keyless `output=embed` URL so no API key is
 * required. The map stays interactive (zoom + pan); a small "Open in
 * Google Maps" link sits in the bottom-right corner so users can
 * launch the full Google Maps tab in a new window.
 */
export default function GoogleMapTextBlock({
  content,
}: {
  content: GoogleMapTextContent;
}) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const mapPct = clamp(content?.map_width_pct ?? 40, 10, 90);
  const textPct = 100 - mapPct;
  const mapOnLeft = (content?.map_side ?? "left") === "left";
  const valign = content?.vertical_align ?? "center";
  const alignItems =
    valign === "top" ? "items-start" : valign === "bottom" ? "items-end" : "items-center";
  const halign = content?.map_horizontal_align ?? "center";
  const justifyMap =
    halign === "left" ? "justify-start"
    : halign === "right" ? "justify-end"
    : "justify-center";

  // Container dims — same logic as ImageText: when container_height_px
  // is set, the section is that tall and padding_y is unused.
  const containerWidth = content?.container_width_px ?? 1400;
  const containerHeightPx = content?.container_height_px ?? 0;
  const hasFixedHeight = containerHeightPx > 0;
  const padY = hasFixedHeight ? 0 : content?.padding_y_px ?? 48;

  // Map fields
  const lat = numOr(content?.lat, DEFAULT_LAT);
  const lng = numOr(content?.lng, DEFAULT_LNG);
  const zoom = clamp(numOr(content?.zoom, DEFAULT_ZOOM), 0, 21);
  const label = (content?.marker_label ?? "").trim();
  const openLabel = content?.open_label ?? "Open in Google Maps ↗";
  const radius = clamp(content?.map_corner_radius_px ?? 0, 0, 80);

  // Two embed strategies:
  //  - When a marker_label is set (treated as a Google Maps place
  //    name like "Anamaya Resort"), search by that name and centre
  //    the map at the saved coords. Google finds the place's own
  //    pin + place card — much richer than a generic "loc:" dot.
  //  - Otherwise place a precise pin at the coords with `loc:LAT,LNG`,
  //    which tells Maps "this is a coordinate, don't search."
  const labelQ = encodeURIComponent(label);
  const embedSrc = label
    ? `https://maps.google.com/maps?q=${labelQ}&ll=${lat},${lng}&z=${zoom}&output=embed`
    : `https://maps.google.com/maps?q=loc:${lat},${lng}&z=${zoom}&output=embed`;
  // Open-in-Maps button: link to the place page at the same coords +
  // zoom so the new tab opens at the same view, showing the place
  // name when one was provided.
  const openHref = label
    ? `https://www.google.com/maps/place/${labelQ}/@${lat},${lng},${zoom}z`
    : `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},${zoom}z`;

  const gridCols = mapOnLeft
    ? `${mapPct}% ${textPct}%`
    : `${textPct}% ${mapPct}%`;

  const mapCell = (
    <div className={`flex h-full w-full overflow-hidden ${justifyMap}`}>
      <div
        className="relative w-full"
        style={{
          minHeight: hasFixedHeight ? undefined : 360,
          height: hasFixedHeight ? "100%" : 360,
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        <iframe
          src={embedSrc}
          title={label ? `Map: ${label}` : `Map at ${lat}, ${lng}`}
          className="block h-full w-full"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal shadow-md ring-1 ring-anamaya-charcoal/15 transition-colors hover:bg-white"
        >
          {openLabel}
        </a>
      </div>
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
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <div
          className={`grid ${alignItems}`}
          style={{
            gridTemplateColumns: gridCols,
            gap: 0,
            height: hasFixedHeight ? containerHeightPx : undefined,
          }}
        >
          {mapOnLeft ? mapCell : textCell}
          {mapOnLeft ? textCell : mapCell}
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function numOr(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return Number(v);
  return fallback;
}
