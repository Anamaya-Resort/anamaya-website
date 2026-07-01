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
  previewStaticMap,
}: {
  content: GoogleMapTextContent;
  /** Admin preview only. Renders an OpenStreetMap tile mosaic behind the
   *  live Google iframe so the block snapshot has a capturable map (the
   *  cross-origin iframe can't be rasterised). Never set on public pages. */
  previewStaticMap?: boolean;
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

  // Container width + the inner grid's height. padding_y_px ALWAYS
  // applies to the outer section so editors can space the block away
  // from neighbouring blocks regardless of whether they've also set a
  // fixed inner height. Total section height = grid height + 2*padY.
  const containerWidth = content?.container_width_px ?? 1400;
  const containerHeightPx = content?.container_height_px ?? 0;
  const hasFixedHeight = containerHeightPx > 0;
  const padY = content?.padding_y_px ?? 48;

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

  // Phones stack (1 column, map on top); tablets+ stay side-by-side. The
  // cells are ALWAYS rendered map-then-text so the map is on top when
  // stacked; on tablet+ their left/right position is set by md:col-start
  // (only applied at md+, so the single-column phone layout is untouched).
  const mapColStart = mapOnLeft ? "md:col-start-1" : "md:col-start-2";
  const textColStart = mapOnLeft ? "md:col-start-2" : "md:col-start-1";

  const mapCell = (
    <div className={`flex h-full w-full overflow-hidden ${justifyMap} ${mapColStart}`}>
      <div
        className="relative w-full"
        style={{
          // Floor so the map is always visible — critical when stacked on
          // phones, where the grid row is auto-height (a bare height:100%
          // would collapse to zero).
          minHeight: hasFixedHeight ? 320 : 360,
          height: hasFixedHeight ? "100%" : 360,
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        {previewStaticMap && (
          <StaticTileMap lat={lat} lng={lng} zoom={zoom} radius={radius} />
        )}
        <iframe
          src={embedSrc}
          title={label ? `Map: ${label}` : `Map at ${lat}, ${lng}`}
          className="relative z-10 block h-full w-full"
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
    <div className={`px-6 py-6 md:px-8 ${textColStart}`}>
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
      }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <div
          className={`grid grid-cols-1 md:grid-cols-[var(--cols)] md:[height:var(--gm-h)] ${alignItems}`}
          style={
            {
              "--cols": gridCols,
              "--gm-h": hasFixedHeight ? `${containerHeightPx}px` : "auto",
              gap: 0,
            } as React.CSSProperties
          }
        >
          {mapCell}
          {textCell}
        </div>
      </div>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * A 3×3 mosaic of same-origin OpenStreetMap tiles, centred on the exact
 * coordinate, with a pin at the centre. Used purely as the snapshot
 * fallback for this block (see `previewStaticMap`). Tiles are proxied
 * through /api/map-tile so html-to-image can rasterise them. Standard
 * slippy-map tile math: world is 2^zoom tiles wide; the coordinate's
 * fractional tile position gives both the centre tile and the sub-tile
 * pixel offset used to centre the mosaic in the cell.
 */
function StaticTileMap({
  lat,
  lng,
  zoom,
  radius,
}: {
  lat: number;
  lng: number;
  zoom: number;
  radius: number;
}) {
  const span = 2 ** zoom;
  const xf = ((lng + 180) / 360) * span;
  const latRad = (lat * Math.PI) / 180;
  const yf = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * span;
  const cxTile = Math.floor(xf);
  const cyTile = Math.floor(yf);
  // Pixel position of the coordinate within the 3×3 mosaic (origin = the
  // top-left tile, i.e. cxTile-1 / cyTile-1). Always in [256, 512).
  const px = (xf - (cxTile - 1)) * 256;
  const py = (yf - (cyTile - 1)) * 256;
  const wrapX = (v: number) => ((v % span) + span) % span; // x wraps the globe

  const tiles: { x: number; y: number; key: string }[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const ty = cyTile + row;
      if (ty < 0 || ty >= span) continue;
      tiles.push({ x: wrapX(cxTile + col), y: ty, key: `${col}_${row}` });
    }
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#aadaff]"
      style={{ borderRadius: radius }}
      aria-hidden
    >
      <div
        className="absolute grid"
        style={{
          width: 768,
          height: 768,
          gridTemplateColumns: "repeat(3, 256px)",
          left: `calc(50% - ${px}px)`,
          top: `calc(50% - ${py}px)`,
        }}
      >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={`/api/map-tile?z=${zoom}&x=${t.x}&y=${t.y}`}
            alt=""
            width={256}
            height={256}
            className="block"
          />
        ))}
      </div>
      {/* Pin at the exact coordinate (centre of the cell). */}
      <div
        className="absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -100%)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ae564b" stroke="#ffffff" strokeWidth="1.5">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" fill="#ffffff" stroke="none" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 bg-white/70 px-1 text-[9px] leading-tight text-anamaya-charcoal/70">
        © OpenStreetMap
      </div>
    </div>
  );
}

function numOr(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return Number(v);
  return fallback;
}
