"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import RichTextEditor from "@/components/admin/rte/RichTextEditor";
import type { OrgBranding } from "@/config/brand-tokens";
import type { BlockCta, GoogleMapTextContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

function normalize(c: GoogleMapTextContent | null | undefined): GoogleMapTextContent {
  return {
    container_width_px: c?.container_width_px ?? 1400,
    container_height_px: c?.container_height_px ?? 0,
    map_side: c?.map_side ?? "left",
    map_width_pct: c?.map_width_pct ?? 40,
    vertical_align: c?.vertical_align ?? "center",
    map_horizontal_align: c?.map_horizontal_align ?? "center",
    bg_color: c?.bg_color ?? "",

    lat: c?.lat ?? 9.6483,            // Anamaya Resort, Montezuma, CR
    lng: c?.lng ?? -85.0696,
    zoom: c?.zoom ?? 14,
    marker_label: c?.marker_label ?? "Anamaya Resort",
    open_label: c?.open_label ?? "Open in Google Maps ↗",
    map_corner_radius_px: c?.map_corner_radius_px ?? 0,

    html: c?.html ?? "",
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 48,

    cta_enabled: c?.cta_enabled ?? false,
    cta_label: c?.cta_label ?? "",
    cta_href: c?.cta_href ?? "",
    cta_bg_color: c?.cta_bg_color ?? "",
    cta_text_color: c?.cta_text_color ?? "",
    cta_size_px: c?.cta_size_px ?? 14,
    cta_font: c?.cta_font ?? "body",
  };
}

export default function GoogleMapTextEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: GoogleMapTextContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<GoogleMapTextContent>
      {...props}
      typeSlug="google_map_with_text"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<GoogleMapTextContent> }) {
  const { draft, patch, brandTokens } = state;

  function patchCta(update: Partial<BlockCta>) {
    patch(update as Partial<GoogleMapTextContent>);
  }

  return (
    <div className="space-y-6">
      {/* Container / Layout */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Container &amp; layout</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Container max width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_width_px ?? 1400}
              onChange={(e) =>
                patch({ container_width_px: Number(e.target.value) || 1400 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Container height (px, 0 = auto)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_height_px ?? 0}
              onChange={(e) =>
                patch({ container_height_px: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Map side</span>
            <select
              className={inputCls}
              value={draft.map_side ?? "left"}
              onChange={(e) =>
                patch({ map_side: e.target.value as "left" | "right" })
              }
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Map width %</span>
            <input
              type="number"
              min={10}
              max={90}
              className={inputCls}
              value={draft.map_width_pct ?? 40}
              onChange={(e) =>
                patch({
                  map_width_pct: Math.max(
                    10,
                    Math.min(90, Number(e.target.value) || 40),
                  ),
                })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vertical align</span>
            <select
              className={inputCls}
              value={draft.vertical_align ?? "center"}
              onChange={(e) =>
                patch({
                  vertical_align: e.target.value as
                    | "top"
                    | "center"
                    | "bottom",
                })
              }
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Horizontal align (map)</span>
            <select
              className={inputCls}
              value={draft.map_horizontal_align ?? "center"}
              onChange={(e) =>
                patch({
                  map_horizontal_align: e.target.value as
                    | "left"
                    | "center"
                    | "right",
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 48}
              onChange={(e) =>
                patch({ padding_y_px: Number(e.target.value) || 48 })
              }
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Used when container height is 0 (auto).
            </p>
          </label>
        </div>
      </section>

      {/* Map */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Map</h3>
        <p className="mb-3 text-xs text-anamaya-charcoal/60">
          Uses Google&rsquo;s keyless embed — no API key needed. Coordinates
          are decimal degrees: positive lat is north, negative lng is west.
          Zoom 0 = world view, ~14 = neighborhood, ~18 = building.
          Visit{" "}
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-anamaya-green"
          >
            google.com/maps
          </a>{" "}
          to find coordinates: right-click any point and the lat,lng
          appears at the top of the menu.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Latitude</span>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={draft.lat ?? 9.6483}
              onChange={(e) => patch({ lat: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Longitude</span>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={draft.lng ?? -85.0696}
              onChange={(e) => patch({ lng: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Zoom (0–21)</span>
            <input
              type="number"
              min={0}
              max={21}
              className={inputCls}
              value={draft.zoom ?? 14}
              onChange={(e) =>
                patch({
                  zoom: Math.max(0, Math.min(21, Number(e.target.value) || 14)),
                })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Map corner radius (px)</span>
            <input
              type="number"
              min={0}
              max={80}
              className={inputCls}
              value={draft.map_corner_radius_px ?? 0}
              onChange={(e) =>
                patch({
                  map_corner_radius_px: Math.max(
                    0,
                    Math.min(80, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Marker label (optional)</span>
            <input
              className={inputCls}
              value={draft.marker_label ?? ""}
              onChange={(e) => patch({ marker_label: e.target.value })}
              placeholder="e.g. Anamaya Resort"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Shown next to the dropped pin and on the &ldquo;Open in Google Maps&rdquo; link.
            </p>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Open-in-Maps link text</span>
            <input
              className={inputCls}
              value={draft.open_label ?? ""}
              onChange={(e) => patch({ open_label: e.target.value })}
              placeholder="Open in Google Maps ↗"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              The corner button opens the full Google Maps tab in a new window.
            </p>
          </label>
        </div>
      </section>

      {/* Text */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Text</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className={labelCls}>Body HTML</span>
            <RichTextEditor
              value={draft.html ?? ""}
              onChange={(html) => patch({ html })}
              placeholder="Body text…"
              minHeight={200}
            />
          </div>
          <div>
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaFieldset
        cta={draft as BlockCta}
        onChange={patchCta}
        brandTokens={brandTokens}
      />
    </div>
  );
}
