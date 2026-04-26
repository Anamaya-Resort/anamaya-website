"use client";

import { useState } from "react";
import type {
  TwoColumnContent,
  TwoColumnChildSlug,
  TwoColumnSide,
  RichTextContent,
  PricingTableContent,
  PricingTier,
  FeatureListContent,
  FeatureListItem,
  QuoteContent,
  DateRangeContent,
  RawHtmlContent,
} from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

const SIDE_OPTIONS: { value: TwoColumnChildSlug; label: string }[] = [
  { value: "rich_text",     label: "Rich Text (heading + prose)" },
  { value: "pricing_table", label: "Pricing Table" },
  { value: "feature_list",  label: "Feature List" },
  { value: "quote",         label: "Quote" },
  { value: "date_range",    label: "Date Range" },
  { value: "raw_html",      label: "Raw HTML" },
];

const EMPTY_FOR: Record<TwoColumnChildSlug, unknown> = {
  rich_text: { html: "" } as RichTextContent,
  pricing_table: { tiers: [] } as PricingTableContent,
  feature_list: { items: [], layout: "stack" } as FeatureListContent,
  quote: { quote: "" } as QuoteContent,
  date_range: { fallback_text: "" } as DateRangeContent,
  raw_html: { html: "" } as RawHtmlContent,
};

export default function TwoColumnEditor({
  content,
  onSave,
}: {
  content: TwoColumnContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<TwoColumnContent>(content ?? {});
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<TwoColumnContent>) {
    setState((s) => ({ ...s, ...p }));
  }
  function setSide(which: "left" | "right", side: TwoColumnSide | undefined) {
    setState((s) => ({ ...s, [which]: side }));
  }

  return (
    <form
      action={async () => {
        setSaving(true);
        try {
          await onSave(state);
        } finally {
          setSaving(false);
        }
      }}
      className="grid grid-cols-1 gap-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
    >
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Layout
        </legend>
        <Field label="Left column width % (20–80)">
          <input
            type="number"
            min={20}
            max={80}
            className={inputCls}
            value={state.left_width_pct ?? 50}
            onChange={(e) => patch({ left_width_pct: Number(e.target.value) })}
          />
        </Field>
        <Field label="Gap between columns (px)">
          <input
            type="number"
            className={inputCls}
            value={state.gap_px ?? 48}
            onChange={(e) => patch({ gap_px: Number(e.target.value) })}
          />
        </Field>
        <Field label="Container max width (px)">
          <input
            type="number"
            className={inputCls}
            value={state.container_width_px ?? 1200}
            onChange={(e) => patch({ container_width_px: Number(e.target.value) })}
          />
        </Field>
        <Field label="Vertical alignment">
          <select
            className={inputCls}
            value={state.vertical_align ?? "top"}
            onChange={(e) =>
              patch({ vertical_align: e.target.value as TwoColumnContent["vertical_align"] })
            }
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </select>
        </Field>
        <Field label="Vertical padding (px)">
          <input
            type="number"
            className={inputCls}
            value={state.padding_y_px ?? 64}
            onChange={(e) => patch({ padding_y_px: Number(e.target.value) })}
          />
        </Field>
        <Field label="Background color (brand token or hex)">
          <input
            className={inputCls}
            value={state.bg_color ?? ""}
            onChange={(e) => patch({ bg_color: e.target.value })}
          />
        </Field>
        <Field label="Text color (brand token or hex)">
          <input
            className={inputCls}
            value={state.text_color ?? ""}
            onChange={(e) => patch({ text_color: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={state.mobile_stack ?? true}
            onChange={(e) => patch({ mobile_stack: e.target.checked })}
          />
          <span className="text-xs uppercase tracking-wider text-anamaya-charcoal/70">
            Stack vertically on mobile
          </span>
        </label>
      </fieldset>

      <ColumnEditor
        label="Left column"
        side={state.left}
        onChange={(s) => setSide("left", s)}
      />
      <ColumnEditor
        label="Right column"
        side={state.right}
        onChange={(s) => setSide("right", s)}
      />

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Call-To-Action (optional, renders below both columns)
        </legend>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={!!state.cta_enabled}
            onChange={(e) => patch({ cta_enabled: e.target.checked })}
          />
          <span className="text-sm">Enable CTA button</span>
        </label>
        <Field label="CTA label">
          <input
            className={inputCls}
            value={state.cta_label ?? ""}
            onChange={(e) => patch({ cta_label: e.target.value })}
          />
        </Field>
        <Field label="CTA href">
          <input
            className={inputCls}
            value={state.cta_href ?? ""}
            onChange={(e) => patch({ cta_href: e.target.value })}
          />
        </Field>
        <Field label="CTA bg color (brand token or hex)">
          <input
            className={inputCls}
            value={state.cta_bg_color ?? ""}
            onChange={(e) => patch({ cta_bg_color: e.target.value })}
          />
        </Field>
        <Field label="CTA text color (brand token or hex)">
          <input
            className={inputCls}
            value={state.cta_text_color ?? ""}
            onChange={(e) => patch({ cta_text_color: e.target.value })}
          />
        </Field>
        <Field label="CTA font">
          <select
            className={inputCls}
            value={state.cta_font ?? "body"}
            onChange={(e) =>
              patch({ cta_font: e.target.value as "body" | "heading" })
            }
          >
            <option value="body">Body</option>
            <option value="heading">Heading</option>
          </select>
        </Field>
        <Field label="CTA size (px)">
          <input
            type="number"
            className={inputCls}
            value={state.cta_size_px ?? 14}
            onChange={(e) => patch({ cta_size_px: Number(e.target.value) })}
          />
        </Field>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function ColumnEditor({
  label,
  side,
  onChange,
}: {
  label: string;
  side: TwoColumnSide | undefined;
  onChange: (next: TwoColumnSide | undefined) => void;
}) {
  const slug = side?.type_slug;

  function setType(next: TwoColumnChildSlug | "") {
    if (!next) {
      onChange(undefined);
      return;
    }
    if (next === slug) return;
    onChange({ type_slug: next, content: EMPTY_FOR[next] });
  }
  function setContent(content: unknown) {
    if (!slug) return;
    onChange({ type_slug: slug, content });
  }

  return (
    <fieldset className="rounded-md border border-zinc-200 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-anamaya-olive-dark">
        {label}
      </legend>
      <div className="mb-3">
        <Field label="Block type">
          <select
            className={inputCls}
            value={slug ?? ""}
            onChange={(e) => setType(e.target.value as TwoColumnChildSlug | "")}
          >
            <option value="">— empty —</option>
            {SIDE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {slug === "rich_text" && (
        <RichTextSubEditor
          value={(side?.content as RichTextContent) ?? { html: "" }}
          onChange={setContent}
        />
      )}
      {slug === "pricing_table" && (
        <PricingTableSubEditor
          value={(side?.content as PricingTableContent) ?? { tiers: [] }}
          onChange={setContent}
        />
      )}
      {slug === "feature_list" && (
        <FeatureListSubEditor
          value={(side?.content as FeatureListContent) ?? { items: [] }}
          onChange={setContent}
        />
      )}
      {slug === "quote" && (
        <QuoteSubEditor
          value={(side?.content as QuoteContent) ?? { quote: "" }}
          onChange={setContent}
        />
      )}
      {slug === "date_range" && (
        <DateRangeSubEditor
          value={(side?.content as DateRangeContent) ?? {}}
          onChange={setContent}
        />
      )}
      {slug === "raw_html" && (
        <RawHtmlSubEditor
          value={(side?.content as RawHtmlContent) ?? { html: "" }}
          onChange={setContent}
        />
      )}
    </fieldset>
  );
}

// ─── Sub-editors ──────────────────────────────────────────────────────

function RichTextSubEditor({
  value,
  onChange,
}: {
  value: RichTextContent;
  onChange: (v: RichTextContent) => void;
}) {
  return (
    <Field label="HTML">
      <textarea
        rows={8}
        className={`${inputCls} font-mono`}
        value={value.html ?? ""}
        onChange={(e) => onChange({ ...value, html: e.target.value })}
        placeholder="<h2>Embrace the Sacred Language…</h2><p>…</p>"
      />
    </Field>
  );
}

function PricingTableSubEditor({
  value,
  onChange,
}: {
  value: PricingTableContent;
  onChange: (v: PricingTableContent) => void;
}) {
  function patchTier(idx: number, p: Partial<PricingTier>) {
    onChange({
      ...value,
      tiers: (value.tiers ?? []).map((t, i) => (i === idx ? { ...t, ...p } : t)),
    });
  }
  function addTier() {
    onChange({
      ...value,
      tiers: [...(value.tiers ?? []), { name: "New tier", price: "", note: "" }],
    });
  }
  function removeTier(idx: number) {
    onChange({ ...value, tiers: (value.tiers ?? []).filter((_, i) => i !== idx) });
  }
  function moveTier(idx: number, dir: -1 | 1) {
    const arr = [...(value.tiers ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange({ ...value, tiers: arr });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Heading">
        <input
          className={inputCls}
          value={value.heading ?? ""}
          onChange={(e) => onChange({ ...value, heading: e.target.value })}
          placeholder="Women's Retreat Prices:"
        />
      </Field>
      <Field label="Force columns">
        <select
          className={inputCls}
          value={value.columns ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              columns: e.target.value
                ? (Number(e.target.value) as 1 | 2 | 3 | 4)
                : undefined,
            })
          }
        >
          <option value="">Auto</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </Field>

      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Tiers
          </span>
          <button
            type="button"
            onClick={addTier}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
          >
            + Add tier
          </button>
        </div>
        <ul className="space-y-3">
          {(value.tiers ?? []).map((tier, idx) => (
            <li key={idx} className="rounded border border-zinc-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  className={inputCls}
                  value={tier.name}
                  onChange={(e) => patchTier(idx, { name: e.target.value })}
                  placeholder="Name"
                />
                <input
                  className={inputCls}
                  value={tier.price ?? ""}
                  onChange={(e) => patchTier(idx, { price: e.target.value })}
                  placeholder="$2,800"
                />
                <input
                  className={inputCls}
                  value={tier.note ?? ""}
                  onChange={(e) => patchTier(idx, { note: e.target.value })}
                  placeholder="Note"
                />
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!tier.highlight}
                    onChange={(e) => patchTier(idx, { highlight: e.target.checked })}
                  />
                  Highlight
                </label>
                <button
                  type="button"
                  onClick={() => moveTier(idx, -1)}
                  className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveTier(idx, 1)}
                  className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  className="ml-auto text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="sm:col-span-2">
        <Field label="Footnote">
          <input
            className={inputCls}
            value={value.footnote ?? ""}
            onChange={(e) => onChange({ ...value, footnote: e.target.value })}
            placeholder="*All prices subject to 13% Costa Rica tax."
          />
        </Field>
      </div>
    </div>
  );
}

function FeatureListSubEditor({
  value,
  onChange,
}: {
  value: FeatureListContent;
  onChange: (v: FeatureListContent) => void;
}) {
  function patchItem(idx: number, p: Partial<FeatureListItem>) {
    onChange({
      ...value,
      items: (value.items ?? []).map((it, i) => (i === idx ? { ...it, ...p } : it)),
    });
  }
  function addItem() {
    onChange({
      ...value,
      items: [...(value.items ?? []), { title: "New item" }],
    });
  }
  function removeItem(idx: number) {
    onChange({ ...value, items: (value.items ?? []).filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-3">
      <Field label="Heading">
        <input
          className={inputCls}
          value={value.heading ?? ""}
          onChange={(e) => onChange({ ...value, heading: e.target.value })}
        />
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Items
          </span>
          <button
            type="button"
            onClick={addItem}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
          >
            + Add item
          </button>
        </div>
        <ul className="space-y-2">
          {(value.items ?? []).map((it, idx) => (
            <li key={idx} className="rounded border border-zinc-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className={inputCls}
                  value={it.title}
                  onChange={(e) => patchItem(idx, { title: e.target.value })}
                  placeholder="Title"
                />
                <input
                  className={inputCls}
                  value={it.description ?? ""}
                  onChange={(e) => patchItem(idx, { description: e.target.value })}
                  placeholder="Description (optional)"
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="mt-2 text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function QuoteSubEditor({
  value,
  onChange,
}: {
  value: QuoteContent;
  onChange: (v: QuoteContent) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Quote">
          <textarea
            rows={4}
            className={inputCls}
            value={value.quote ?? ""}
            onChange={(e) => onChange({ ...value, quote: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Attribution">
        <input
          className={inputCls}
          value={value.attribution ?? ""}
          onChange={(e) => onChange({ ...value, attribution: e.target.value })}
        />
      </Field>
      <Field label="Role / context">
        <input
          className={inputCls}
          value={value.attribution_role ?? ""}
          onChange={(e) => onChange({ ...value, attribution_role: e.target.value })}
        />
      </Field>
      <Field label="Variant">
        <select
          className={inputCls}
          value={value.variant ?? "card"}
          onChange={(e) =>
            onChange({ ...value, variant: e.target.value as QuoteContent["variant"] })
          }
        >
          <option value="card">Card</option>
          <option value="pull">Pull quote</option>
          <option value="banner">Banner</option>
        </select>
      </Field>
    </div>
  );
}

function DateRangeSubEditor({
  value,
  onChange,
}: {
  value: DateRangeContent;
  onChange: (v: DateRangeContent) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Label (e.g. &quot;Dates:&quot;)">
        <input
          className={inputCls}
          value={value.label ?? ""}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Field>
      <Field label="Fallback text (when no dates)">
        <input
          className={inputCls}
          value={value.fallback_text ?? ""}
          onChange={(e) => onChange({ ...value, fallback_text: e.target.value })}
        />
      </Field>
      <Field label="Start date">
        <input
          type="date"
          className={inputCls}
          value={value.start_date ?? ""}
          onChange={(e) => onChange({ ...value, start_date: e.target.value })}
        />
      </Field>
      <Field label="End date">
        <input
          type="date"
          className={inputCls}
          value={value.end_date ?? ""}
          onChange={(e) => onChange({ ...value, end_date: e.target.value })}
        />
      </Field>
    </div>
  );
}

function RawHtmlSubEditor({
  value,
  onChange,
}: {
  value: RawHtmlContent;
  onChange: (v: RawHtmlContent) => void;
}) {
  return (
    <Field label="HTML">
      <textarea
        rows={8}
        className={`${inputCls} font-mono`}
        value={value.html ?? ""}
        onChange={(e) => onChange({ ...value, html: e.target.value })}
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        {label}
      </span>
      {children}
    </label>
  );
}
