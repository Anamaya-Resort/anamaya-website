"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";
import type { OrgBranding } from "@/config/brand-tokens";
import type {
  BlockCta,
  FeatureListContent,
  FeatureListItem,
} from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

const ICON_OPTIONS: NonNullable<FeatureListItem["icon"]>[] = [
  "check",
  "star",
  "heart",
  "leaf",
  "sparkle",
  "dot",
];

function normalize(c: FeatureListContent | null | undefined): FeatureListContent {
  return {
    heading: c?.heading ?? "",
    intro: c?.intro ?? "",
    items: c?.items ?? [],
    layout: c?.layout ?? "grid",
    columns: c?.columns ?? 3,
    stack_columns: c?.stack_columns ?? 1,
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 64,
    content_width_px: c?.content_width_px ?? 1200,
    decoration_url: c?.decoration_url ?? "",
    decoration_alt: c?.decoration_alt ?? "",
    decoration_position: c?.decoration_position ?? "bottom-right",
    decoration_size_px: c?.decoration_size_px ?? 240,
    decoration_opacity: c?.decoration_opacity ?? 100,
    decoration_flip_x: c?.decoration_flip_x ?? false,
    decoration_flip_y: c?.decoration_flip_y ?? false,
    decoration_offset_x_px: c?.decoration_offset_x_px ?? 0,
    decoration_offset_y_px: c?.decoration_offset_y_px ?? 0,
    decoration_show_mobile: c?.decoration_show_mobile ?? false,
    cta_enabled: c?.cta_enabled ?? false,
    cta_label: c?.cta_label ?? "",
    cta_href: c?.cta_href ?? "",
    cta_bg_color: c?.cta_bg_color ?? "",
    cta_text_color: c?.cta_text_color ?? "",
    cta_size_px: c?.cta_size_px ?? 14,
    cta_font: c?.cta_font ?? "body",
  };
}

export default function FeatureListEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: FeatureListContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<FeatureListContent>
      {...props}
      typeSlug="feature_list"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<FeatureListContent> }) {
  const { draft, patch, brandTokens } = state;
  const items = draft.items ?? [];

  function patchItem(idx: number, p: Partial<FeatureListItem>) {
    patch({ items: items.map((it, i) => (i === idx ? { ...it, ...p } : it)) });
  }
  function addItem() {
    patch({ items: [...items, { title: "New item" }] });
  }
  function removeItem(idx: number) {
    patch({ items: items.filter((_, i) => i !== idx) });
  }
  function moveItem(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const arr = items.slice();
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    patch({ items: arr });
  }

  return (
    <div className="space-y-6">
      {/* Heading + intro */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Heading + intro</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Layout</span>
            <select
              className={inputCls}
              value={draft.layout ?? "grid"}
              onChange={(e) =>
                patch({ layout: e.target.value as FeatureListContent["layout"] })
              }
            >
              <option value="stack">Stack (vertical list)</option>
              <option value="grid">Grid (multi-column)</option>
              <option value="split">Split (alternating image side)</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Intro text (optional)</span>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.intro ?? ""}
              onChange={(e) => patch({ intro: e.target.value })}
            />
          </label>
          {draft.layout === "grid" && (
            <label className="block">
              <span className={labelCls}>Grid columns</span>
              <select
                className={inputCls}
                value={draft.columns ?? 3}
                onChange={(e) =>
                  patch({ columns: Number(e.target.value) as 2 | 3 | 4 })
                }
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </label>
          )}
          {draft.layout === "stack" && (
            <label className="block">
              <span className={labelCls}>Stack columns</span>
              <select
                className={inputCls}
                value={draft.stack_columns ?? 1}
                onChange={(e) =>
                  patch({ stack_columns: Number(e.target.value) as 1 | 2 })
                }
              >
                <option value="1">1 (single column)</option>
                <option value="2">2 (side-by-side)</option>
              </select>
              <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
                When 2, each item below picks which column it lands in.
              </p>
            </label>
          )}
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
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 64}
              onChange={(e) =>
                patch({ padding_y_px: Number(e.target.value) || 64 })
              }
            />
          </label>
        </div>
      </section>

      {/* Items */}
      <section className={sectionCls}>
        <header className="mb-3 flex items-center justify-between">
          <h3 className={sectionTitleCls}>Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="rounded-full bg-anamaya-green px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Add item
          </button>
        </header>
        {items.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 bg-white p-4 text-center text-xs italic text-anamaya-charcoal/50">
            No items yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="rounded-md border border-zinc-200 bg-white p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputCls}
                    value={item.title}
                    onChange={(e) => patchItem(idx, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <input
                    className={inputCls}
                    value={item.price ?? ""}
                    onChange={(e) => patchItem(idx, { price: e.target.value })}
                    placeholder="Price (optional)"
                  />
                </div>
                <textarea
                  rows={2}
                  className={`${inputCls} mt-2`}
                  value={item.description ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { description: e.target.value })
                  }
                  placeholder="Description (optional)"
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className={labelCls}>Marker</span>
                    <MarkerField
                      item={item}
                      onChange={(p) => patchItem(idx, p)}
                    />
                  </div>
                  <input
                    className={`${inputCls} self-end`}
                    value={item.href ?? ""}
                    onChange={(e) => patchItem(idx, { href: e.target.value })}
                    placeholder="Link href (optional)"
                  />
                </div>
                {(draft.stack_columns ?? 1) === 2 && draft.layout === "stack" && (
                  <label className="mt-2 block w-32">
                    <span className={labelCls}>Column</span>
                    <select
                      className={inputCls}
                      value={item.column ?? 1}
                      onChange={(e) =>
                        patchItem(idx, {
                          column: Number(e.target.value) as 1 | 2,
                        })
                      }
                    >
                      <option value="1">Left</option>
                      <option value="2">Right</option>
                    </select>
                  </label>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <ImageUploadButton
                    value={item.image_url}
                    onUploaded={(url) => patchItem(idx, { image_url: url })}
                    kind="feature-items"
                    maxWidth={1200}
                  />
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  )}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section frame (decoration) */}
      <SectionFrameFieldset
        frame={draft}
        onChange={(u) => patch(u as Partial<FeatureListContent>)}
        defaultWidth={1200}
      />

      {/* CTA */}
      <CtaFieldset
        cta={draft as BlockCta}
        onChange={(u) => patch(u as Partial<FeatureListContent>)}
        brandTokens={brandTokens}
      />
    </div>
  );
}

const EMOJI_PRESETS: { emoji: string; label: string }[] = [
  { emoji: "✓", label: "Checkmark" },
  { emoji: "•", label: "Bullet" },
  { emoji: "🍃", label: "Leaf" },
];

/**
 * Per-item marker control. Three preset buttons (✓ • 🍃) for the most
 * common list-bullet styles, plus a free-form input where editors can
 * paste any emoji they want — that emoji becomes the marker on save.
 *
 * Empty marker_emoji falls back to the SVG icon set; selecting an
 * emoji here OVERRIDES the icon. The Icon dropdown is still surfaced
 * so editors can pick a built-in SVG when an emoji isn't desired.
 */
function MarkerField({
  item,
  onChange,
}: {
  item: FeatureListItem;
  onChange: (patch: Partial<FeatureListItem>) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-2">
      {/* Preset emoji buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          Emoji preset:
        </span>
        {EMOJI_PRESETS.map((p) => {
          const active = item.marker_emoji === p.emoji;
          return (
            <button
              key={p.emoji}
              type="button"
              title={p.label}
              onClick={() =>
                onChange({ marker_emoji: active ? "" : p.emoji })
              }
              className={`flex h-7 w-7 items-center justify-center rounded text-base leading-none transition-colors ${
                active
                  ? "bg-anamaya-green text-white"
                  : "border border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {p.emoji}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange({ marker_emoji: "" })}
          className="ml-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-anamaya-charcoal/60 hover:bg-zinc-50"
          title="Clear the emoji marker (falls back to the SVG icon below)"
        >
          Clear
        </button>
      </div>

      {/* Custom emoji paste */}
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-anamaya-charcoal/60">
          Or paste any emoji
        </span>
        <input
          className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          value={item.marker_emoji ?? ""}
          onChange={(e) => onChange({ marker_emoji: e.target.value })}
          placeholder="e.g. ⭐ 🔥 🌊 ✨"
        />
      </label>

      {/* SVG icon fallback */}
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-anamaya-charcoal/60">
          Or pick an SVG icon (used only when emoji is empty)
        </span>
        <select
          className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          value={item.icon ?? ""}
          onChange={(e) =>
            onChange({
              icon: e.target.value
                ? (e.target.value as FeatureListItem["icon"])
                : undefined,
            })
          }
        >
          <option value="">No icon</option>
          {ICON_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
