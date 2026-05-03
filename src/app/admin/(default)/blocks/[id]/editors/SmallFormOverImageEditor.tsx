"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type {
  BlockBlendMode,
  CardSizeUnit,
  SmallFormOverImageContent,
} from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

const BLEND_MODES: BlockBlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

function normalize(c: SmallFormOverImageContent | null | undefined): SmallFormOverImageContent {
  return {
    banner_height_px: c?.banner_height_px ?? 600,
    bg_color: c?.bg_color ?? "",
    bg_image_url: c?.bg_image_url ?? "",
    bg_image_alt: c?.bg_image_alt ?? "",
    bg_image_opacity: c?.bg_image_opacity ?? 100,
    bg_image_blend_mode: c?.bg_image_blend_mode ?? "normal",

    card_width_value: c?.card_width_value ?? 50,
    card_width_unit: c?.card_width_unit ?? "pct",
    card_height_value: c?.card_height_value ?? 80,
    card_height_unit: c?.card_height_unit ?? "pct",
    card_horizontal_align: c?.card_horizontal_align ?? "center",
    card_vertical_align: c?.card_vertical_align ?? "center",
    card_corner_radius_px: c?.card_corner_radius_px ?? 8,
    card_padding_px: c?.card_padding_px ?? 32,

    card_bg_color: c?.card_bg_color ?? "",
    card_bg_image_url: c?.card_bg_image_url ?? "",
    card_bg_image_alt: c?.card_bg_image_alt ?? "",
    card_bg_image_opacity: c?.card_bg_image_opacity ?? 100,
    card_bg_image_blend_mode: c?.card_bg_image_blend_mode ?? "normal",

    heading: c?.heading ?? "",
    heading_font: c?.heading_font ?? "heading",
    heading_size_px: c?.heading_size_px ?? 32,
    heading_color: c?.heading_color ?? "",
    heading_bold: c?.heading_bold ?? false,
    heading_italic: c?.heading_italic ?? false,

    subheading: c?.subheading ?? "",
    subheading_font: c?.subheading_font ?? "body",
    subheading_size_px: c?.subheading_size_px ?? 16,
    subheading_color: c?.subheading_color ?? "",

    form_id: c?.form_id ?? "",
    form_name: c?.form_name ?? "Newsletter Home Page",
    form_height_px: c?.form_height_px ?? 460,
  };
}

export default function SmallFormOverImageEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: SmallFormOverImageContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<SmallFormOverImageContent>
      {...props}
      typeSlug="small_form_over_image"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<SmallFormOverImageContent> }) {
  const { draft, patch, brandTokens } = state;

  return (
    <div className="space-y-6">
      {/* Banner background */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Banner background</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Banner height (px)</span>
            <input
              type="number"
              min={200}
              max={1600}
              className={inputCls}
              value={draft.banner_height_px ?? 600}
              onChange={(e) =>
                patch({ banner_height_px: Number(e.target.value) || 600 })
              }
            />
          </label>
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = anamaya-charcoal.
            </p>
          </div>
          <ImageField
            label="Background image (optional)"
            url={draft.bg_image_url}
            alt={draft.bg_image_alt}
            kind="banner-bg"
            onChange={(u, a) => patch({ bg_image_url: u, bg_image_alt: a })}
          />
          <label className="block">
            <span className={labelCls}>Image opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.bg_image_opacity ?? 100}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  bg_image_opacity: Number.isFinite(n)
                    ? Math.max(0, Math.min(100, n))
                    : 100,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Image blend mode</span>
            <select
              className={inputCls}
              value={draft.bg_image_blend_mode ?? "normal"}
              onChange={(e) =>
                patch({ bg_image_blend_mode: e.target.value as BlockBlendMode })
              }
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Card size + position */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Card size &amp; position</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SizeField
            label="Card width"
            value={draft.card_width_value}
            unit={draft.card_width_unit}
            onChange={(v, u) => patch({ card_width_value: v, card_width_unit: u })}
          />
          <SizeField
            label="Card height"
            value={draft.card_height_value}
            unit={draft.card_height_unit}
            onChange={(v, u) => patch({ card_height_value: v, card_height_unit: u })}
          />
          <label className="block">
            <span className={labelCls}>Horizontal align</span>
            <select
              className={inputCls}
              value={draft.card_horizontal_align ?? "center"}
              onChange={(e) =>
                patch({
                  card_horizontal_align: e.target.value as
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
          <label className="block">
            <span className={labelCls}>Vertical align</span>
            <select
              className={inputCls}
              value={draft.card_vertical_align ?? "center"}
              onChange={(e) =>
                patch({
                  card_vertical_align: e.target.value as
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
            <span className={labelCls}>Corner radius (px)</span>
            <input
              type="number"
              min={0}
              max={60}
              className={inputCls}
              value={draft.card_corner_radius_px ?? 8}
              onChange={(e) =>
                patch({
                  card_corner_radius_px: Math.max(
                    0,
                    Math.min(60, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Card padding (px)</span>
            <input
              type="number"
              min={0}
              max={200}
              className={inputCls}
              value={draft.card_padding_px ?? 32}
              onChange={(e) =>
                patch({
                  card_padding_px: Math.max(
                    0,
                    Math.min(200, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </label>
        </div>
      </section>

      {/* Card background */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Card background</h3>
        <p className="mb-3 text-xs text-anamaya-charcoal/60">
          The card&rsquo;s colour is always 100 % opaque. Only the optional
          card image can be made translucent or blended on top of it.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Card color</span>
            <BrandColorSelect
              value={draft.card_bg_color}
              onChange={(v) => patch({ card_bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = anamaya-cream.
            </p>
          </div>
          <ImageField
            label="Card image (optional)"
            url={draft.card_bg_image_url}
            alt={draft.card_bg_image_alt}
            kind="card-bg"
            onChange={(u, a) =>
              patch({ card_bg_image_url: u, card_bg_image_alt: a })
            }
          />
          <label className="block">
            <span className={labelCls}>Card image opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.card_bg_image_opacity ?? 100}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  card_bg_image_opacity: Number.isFinite(n)
                    ? Math.max(0, Math.min(100, n))
                    : 100,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Card image blend mode</span>
            <select
              className={inputCls}
              value={draft.card_bg_image_blend_mode ?? "normal"}
              onChange={(e) =>
                patch({
                  card_bg_image_blend_mode: e.target.value as BlockBlendMode,
                })
              }
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Heading + subheading */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Heading + subheading</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Heading font</span>
            <select
              className={inputCls}
              value={draft.heading_font ?? "heading"}
              onChange={(e) =>
                patch({ heading_font: e.target.value as "body" | "heading" })
              }
            >
              <option value="heading">Heading</option>
              <option value="body">Body</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Heading size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.heading_size_px ?? 32}
              onChange={(e) =>
                patch({ heading_size_px: Number(e.target.value) || 32 })
              }
            />
          </label>
          <div>
            <span className={labelCls}>Heading color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!draft.heading_bold}
                onChange={(e) => patch({ heading_bold: e.target.checked })}
              />
              Bold
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!draft.heading_italic}
                onChange={(e) => patch({ heading_italic: e.target.checked })}
              />
              Italic
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Subheading</span>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.subheading ?? ""}
              onChange={(e) => patch({ subheading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Subheading font</span>
            <select
              className={inputCls}
              value={draft.subheading_font ?? "body"}
              onChange={(e) =>
                patch({ subheading_font: e.target.value as "body" | "heading" })
              }
            >
              <option value="body">Body</option>
              <option value="heading">Heading</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Subheading size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.subheading_size_px ?? 16}
              onChange={(e) =>
                patch({ subheading_size_px: Number(e.target.value) || 16 })
              }
            />
          </label>
          <div className="sm:col-span-2">
            <span className={labelCls}>Subheading color</span>
            <BrandColorSelect
              value={draft.subheading_color}
              onChange={(v) => patch({ subheading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>

      {/* Form */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Embedded form</h3>
        <p className="mb-3 text-xs text-anamaya-charcoal/60">
          Sereenly form id. The default is anamaya.com&rsquo;s homepage form
          (&ldquo;Newsletter Home Page&rdquo; — collects first name, last name,
          phone, email).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Sereenly form ID</span>
            <input
              className={inputCls}
              value={draft.form_id ?? ""}
              onChange={(e) => patch({ form_id: e.target.value })}
              placeholder="e.g. 3VbotiuGfLgRUdIpi2ro"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Form analytics name</span>
            <input
              className={inputCls}
              value={draft.form_name ?? ""}
              onChange={(e) => patch({ form_name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Initial form height (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.form_height_px ?? 460}
              onChange={(e) =>
                patch({ form_height_px: Number(e.target.value) || 460 })
              }
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function SizeField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number | undefined;
  unit: CardSizeUnit | undefined;
  onChange: (value: number, unit: CardSizeUnit) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          className={`${inputCls} flex-1`}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value) || 0, unit ?? "pct")}
        />
        <select
          className={`${inputCls} w-20`}
          value={unit ?? "pct"}
          onChange={(e) => onChange(value ?? 0, e.target.value as CardSizeUnit)}
        >
          <option value="pct">%</option>
          <option value="px">px</option>
        </select>
      </div>
    </div>
  );
}

function ImageField({
  label,
  url,
  alt,
  kind,
  onChange,
}: {
  label: string;
  url: string | undefined;
  alt: string | undefined;
  kind: string;
  onChange: (url: string, alt: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
        <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-zinc-100">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="max-h-12 max-w-full object-contain" />
          ) : (
            <span className="text-[10px] italic text-anamaya-charcoal/40">
              no image
            </span>
          )}
        </div>
        <ImageUploadButton
          value={url}
          onUploaded={(u) => onChange(u, alt ?? "")}
          kind={kind}
          maxWidth={2400}
        />
        {url && (
          <button
            type="button"
            onClick={() => onChange("", alt ?? "")}
            className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>
      <input
        className={`${inputCls} mt-2`}
        placeholder="Alt text (for screen readers)"
        value={alt ?? ""}
        onChange={(e) => onChange(url ?? "", e.target.value)}
      />
    </div>
  );
}
