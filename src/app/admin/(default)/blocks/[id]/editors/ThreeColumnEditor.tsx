"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type { BlockCta, ThreeColumnContent, ThreeColumnSide } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

function normalizeSide(s: ThreeColumnSide | undefined): ThreeColumnSide {
  return {
    heading: s?.heading ?? "",
    heading_font: s?.heading_font ?? "heading",
    heading_size_px: s?.heading_size_px ?? 22,
    heading_color: s?.heading_color ?? "",
    heading_bold: s?.heading_bold ?? false,
    heading_italic: s?.heading_italic ?? false,
    image_url: s?.image_url ?? "",
    image_alt: s?.image_alt ?? "",
    body_html: s?.body_html ?? "",
    body_font: s?.body_font ?? "body",
    body_size_px: s?.body_size_px ?? 16,
    body_color: s?.body_color ?? "",
    cta: s?.cta ?? {},
  };
}

function normalize(c: ThreeColumnContent | null | undefined): ThreeColumnContent {
  return {
    heading: c?.heading ?? "",
    heading_font: c?.heading_font ?? "heading",
    heading_size_px: c?.heading_size_px ?? 36,
    heading_color: c?.heading_color ?? "",
    heading_bold: c?.heading_bold ?? false,
    heading_italic: c?.heading_italic ?? false,
    heading_align: c?.heading_align ?? "center",
    bg_color: c?.bg_color ?? "",
    bg_image_url: c?.bg_image_url ?? "",
    bg_image_fit: c?.bg_image_fit ?? "cover",
    bg_image_scale_pct: c?.bg_image_scale_pct ?? 100,
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 64,
    left_gutter_pct: c?.left_gutter_pct ?? 5,
    left_col_pct: c?.left_col_pct ?? 28,
    left_space_pct: c?.left_space_pct ?? 3,
    middle_col_pct: c?.middle_col_pct ?? 28,
    right_space_pct: c?.right_space_pct ?? 3,
    right_col_pct: c?.right_col_pct ?? 28,
    right_gutter_pct: c?.right_gutter_pct ?? 5,
    vertical_align: c?.vertical_align ?? "top",
    mobile_stack: c?.mobile_stack ?? true,
    left: normalizeSide(c?.left),
    middle: normalizeSide(c?.middle),
    right: normalizeSide(c?.right),
  };
}

export default function ThreeColumnEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ThreeColumnContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ThreeColumnContent>
      {...props}
      typeSlug="three_column"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ThreeColumnContent> }) {
  const { draft, patch, brandTokens } = state;

  const widthSum =
    (draft.left_gutter_pct ?? 0) +
    (draft.left_col_pct ?? 0) +
    (draft.left_space_pct ?? 0) +
    (draft.middle_col_pct ?? 0) +
    (draft.right_space_pct ?? 0) +
    (draft.right_col_pct ?? 0) +
    (draft.right_gutter_pct ?? 0);

  function patchSide(key: "left" | "middle" | "right", update: Partial<ThreeColumnSide>) {
    const current = (draft[key] ?? {}) as ThreeColumnSide;
    patch({ [key]: { ...current, ...update } } as Partial<ThreeColumnContent>);
  }

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Section heading (optional)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Heading text</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Font family</span>
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
            <span className={labelCls}>Size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.heading_size_px ?? 36}
              onChange={(e) => patch({ heading_size_px: Number(e.target.value) || 36 })}
            />
          </label>
          <div>
            <span className={labelCls}>Color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Alignment</span>
            <select
              className={inputCls}
              value={draft.heading_align ?? "center"}
              onChange={(e) =>
                patch({ heading_align: e.target.value as "left" | "center" | "right" })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
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
      </section>

      {/* Section background */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Section background</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Body text color (default)</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div className="sm:col-span-2">
            <span className={labelCls}>Background image (optional)</span>
            <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
              <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-zinc-100">
                {draft.bg_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.bg_image_url}
                    alt=""
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] italic text-anamaya-charcoal/40">
                    no image
                  </span>
                )}
              </div>
              <ImageUploadButton
                value={draft.bg_image_url}
                onUploaded={(u) => patch({ bg_image_url: u })}
                kind="block-bg"
                maxWidth={2400}
              />
              {draft.bg_image_url && (
                <button
                  type="button"
                  onClick={() => patch({ bg_image_url: "" })}
                  className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <label className="block">
            <span className={labelCls}>Image fit</span>
            <select
              className={inputCls}
              value={draft.bg_image_fit ?? "cover"}
              onChange={(e) =>
                patch({
                  bg_image_fit: e.target.value as "cover" | "contain" | "tile",
                })
              }
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="tile">Tile</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Image scale (%)</span>
            <input
              type="number"
              min={50}
              max={200}
              className={inputCls}
              value={draft.bg_image_scale_pct ?? 100}
              onChange={(e) =>
                patch({ bg_image_scale_pct: Number(e.target.value) || 100 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 64}
              onChange={(e) => patch({ padding_y_px: Number(e.target.value) || 64 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vertical column align</span>
            <select
              className={inputCls}
              value={draft.vertical_align ?? "top"}
              onChange={(e) =>
                patch({
                  vertical_align: e.target.value as "top" | "center" | "bottom",
                })
              }
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
        </div>
      </section>

      {/* Layout widths */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Layout widths (%)</h3>
        <p className="mb-3 text-xs text-anamaya-charcoal/60">
          Seven horizontal slices: gutter, column, space, column, space, column,
          gutter. Total {widthSum}%
          {widthSum !== 100 && (
            <span className="ml-2 italic">
              — values are auto-normalised by weight, so non-100 totals still render correctly.
            </span>
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-7">
          <WidthInput label="Left gutter" value={draft.left_gutter_pct} onChange={(v) => patch({ left_gutter_pct: v })} />
          <WidthInput label="Left col" value={draft.left_col_pct} onChange={(v) => patch({ left_col_pct: v })} />
          <WidthInput label="Space" value={draft.left_space_pct} onChange={(v) => patch({ left_space_pct: v })} />
          <WidthInput label="Middle col" value={draft.middle_col_pct} onChange={(v) => patch({ middle_col_pct: v })} />
          <WidthInput label="Space" value={draft.right_space_pct} onChange={(v) => patch({ right_space_pct: v })} />
          <WidthInput label="Right col" value={draft.right_col_pct} onChange={(v) => patch({ right_col_pct: v })} />
          <WidthInput label="Right gutter" value={draft.right_gutter_pct} onChange={(v) => patch({ right_gutter_pct: v })} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.mobile_stack !== false}
            onChange={(e) => patch({ mobile_stack: e.target.checked })}
          />
          Stack columns vertically on mobile (recommended)
        </label>
      </section>

      {/* Per-column editors */}
      <ColumnEditor
        title="Left column"
        side={draft.left ?? {}}
        onChange={(u) => patchSide("left", u)}
        brandTokens={brandTokens}
      />
      <ColumnEditor
        title="Middle column"
        side={draft.middle ?? {}}
        onChange={(u) => patchSide("middle", u)}
        brandTokens={brandTokens}
      />
      <ColumnEditor
        title="Right column"
        side={draft.right ?? {}}
        onChange={(u) => patchSide("right", u)}
        brandTokens={brandTokens}
      />
    </div>
  );
}

function WidthInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        className={inputCls}
        value={value ?? 0}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
      />
    </label>
  );
}

function ColumnEditor({
  title,
  side,
  onChange,
  brandTokens,
}: {
  title: string;
  side: ThreeColumnSide;
  onChange: (update: Partial<ThreeColumnSide>) => void;
  brandTokens: Required<OrgBranding>;
}) {
  return (
    <section className={sectionCls}>
      <h3 className={sectionTitleCls}>{title}</h3>

      {/* Heading */}
      <div className="rounded-md border border-zinc-200 bg-white p-3">
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Heading
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Text</span>
            <input
              className={inputCls}
              value={side.heading ?? ""}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Font</span>
            <select
              className={inputCls}
              value={side.heading_font ?? "heading"}
              onChange={(e) =>
                onChange({ heading_font: e.target.value as "body" | "heading" })
              }
            >
              <option value="heading">Heading</option>
              <option value="body">Body</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={side.heading_size_px ?? 22}
              onChange={(e) =>
                onChange({ heading_size_px: Number(e.target.value) || 22 })
              }
            />
          </label>
          <div>
            <span className={labelCls}>Color</span>
            <BrandColorSelect
              value={side.heading_color}
              onChange={(v) => onChange({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!side.heading_bold}
                onChange={(e) => onChange({ heading_bold: e.target.checked })}
              />
              Bold
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!side.heading_italic}
                onChange={(e) => onChange({ heading_italic: e.target.checked })}
              />
              Italic
            </label>
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Image
        </h4>
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-2">
          <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-zinc-100">
            {side.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={side.image_url}
                alt=""
                className="max-h-12 max-w-full object-contain"
              />
            ) : (
              <span className="text-[10px] italic text-anamaya-charcoal/40">
                no image
              </span>
            )}
          </div>
          <ImageUploadButton
            value={side.image_url}
            onUploaded={(u) => onChange({ image_url: u })}
            kind="three-col"
            maxWidth={1600}
          />
          {side.image_url && (
            <button
              type="button"
              onClick={() => onChange({ image_url: "" })}
              className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
        <label className="mt-2 block">
          <span className={labelCls}>Alt text</span>
          <input
            className={inputCls}
            value={side.image_alt ?? ""}
            onChange={(e) => onChange({ image_alt: e.target.value })}
            placeholder="Describe the image for screen readers"
          />
        </label>
      </div>

      {/* Body */}
      <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Body
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Font</span>
            <select
              className={inputCls}
              value={side.body_font ?? "body"}
              onChange={(e) =>
                onChange({ body_font: e.target.value as "body" | "heading" })
              }
            >
              <option value="body">Body</option>
              <option value="heading">Heading</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={side.body_size_px ?? 16}
              onChange={(e) =>
                onChange({ body_size_px: Number(e.target.value) || 16 })
              }
            />
          </label>
          <div>
            <span className={labelCls}>Color</span>
            <BrandColorSelect
              value={side.body_color}
              onChange={(v) => onChange({ body_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
        <label className="mt-2 block">
          <span className={labelCls}>HTML</span>
          <textarea
            rows={5}
            className={`${inputCls} font-mono text-xs`}
            value={side.body_html ?? ""}
            onChange={(e) => onChange({ body_html: e.target.value })}
            placeholder="<p>Body content…</p>"
          />
        </label>
      </div>

      {/* CTA */}
      <div className="mt-3">
        <CtaFieldset
          cta={(side.cta ?? {}) as BlockCta}
          onChange={(update) =>
            onChange({ cta: { ...(side.cta ?? {}), ...update } })
          }
          brandTokens={brandTokens}
        />
      </div>
    </section>
  );
}
