"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { InfoCardContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

type Row = { label: string; value: string };

function normalize(c: InfoCardContent | null | undefined): InfoCardContent {
  return {
    responsive_mode: c?.responsive_mode ?? "fixed",
    heading: c?.heading ?? "",
    subheading: c?.subheading ?? "",
    highlight_label: c?.highlight_label ?? "",
    highlight_value: c?.highlight_value ?? "",
    rows: Array.isArray(c?.rows) ? c!.rows! : [],
    cta_label: c?.cta_label ?? "",
    cta_href: c?.cta_href ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
  };
}

export default function InfoCardEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: InfoCardContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<InfoCardContent>
      {...props}
      typeSlug="info_card"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<InfoCardContent> }) {
  const { draft, patch, brandTokens } = state;
  const rows: Row[] = Array.isArray(draft.rows) ? draft.rows : [];
  const setRows = (next: Row[]) => patch({ rows: next });

  return (
    <div className="space-y-6">
      {/* Vertical-block responsive behavior */}
      <section className="rounded-md border border-anamaya-green/30 bg-anamaya-mint/10 p-4">
        <div className={labelCls}>Responsive behavior (vertical block)</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["fixed", "Fixed — always visible"],
              ["hidden", "Hidden — slide-out on mobile"],
            ] as const
          ).map(([val, lbl]) => {
            const active = (draft.responsive_mode ?? "fixed") === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => patch({ responsive_mode: val })}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
                  active
                    ? "bg-anamaya-green text-white ring-anamaya-green"
                    : "bg-white text-anamaya-charcoal/70 ring-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] italic text-anamaya-charcoal/60">
          On a narrow screen, Fixed cards stack inline; Hidden cards collapse to a tab on the left
          edge that slides the side column out when tapped.
        </p>
      </section>

      {/* Content */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Card content</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="e.g. This Retreat"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Sub-text</span>
            <input
              className={inputCls}
              value={draft.subheading ?? ""}
              onChange={(e) => patch({ subheading: e.target.value })}
              placeholder="(optional)"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Highlight label</span>
            <input
              className={inputCls}
              value={draft.highlight_label ?? ""}
              onChange={(e) => patch({ highlight_label: e.target.value })}
              placeholder="From"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Highlight value</span>
            <input
              className={inputCls}
              value={draft.highlight_value ?? ""}
              onChange={(e) => patch({ highlight_value: e.target.value })}
              placeholder="$895"
            />
          </label>
        </div>

        {/* Quick-fact rows */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls}>Quick facts</span>
            <button
              type="button"
              onClick={() => setRows([...rows, { label: "", value: "" }])}
              className="rounded-full border border-anamaya-green px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-anamaya-green hover:bg-anamaya-green hover:text-white"
            >
              + Add row
            </button>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={r.label}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], label: e.target.value };
                    setRows(next);
                  }}
                  placeholder="Label (e.g. Dates)"
                />
                <input
                  className={inputCls}
                  value={r.value}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], value: e.target.value };
                    setRows(next);
                  }}
                  placeholder="Value (e.g. Sep 12–19)"
                />
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  title="Remove row"
                >
                  ×
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-[11px] italic text-anamaya-charcoal/50">
                No rows yet. Add label/value pairs like Dates, Length, Level.
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Button label</span>
            <input
              className={inputCls}
              value={draft.cta_label ?? ""}
              onChange={(e) => patch({ cta_label: e.target.value })}
              placeholder="Book Now"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Button link</span>
            <input
              className={inputCls}
              value={draft.cta_href ?? ""}
              onChange={(e) => patch({ cta_href: e.target.value })}
              placeholder="https://..."
            />
          </label>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Card background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">Auto = white.</p>
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
    </div>
  );
}
