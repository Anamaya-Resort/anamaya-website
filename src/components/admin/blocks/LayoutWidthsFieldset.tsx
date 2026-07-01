"use client";

import type { LayoutWidthsContent } from "@/lib/layout-widths";

/**
 * Editor control for the shared 3-slice "Layout widths" model
 * (left gutter / content / right gutter), with independent Desktop and
 * Tablet sets. Phones always render content full-width. Meant to be the
 * first section under the live preview in each block editor.
 */

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";
const subTitleCls =
  "mb-2 text-[12px] font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function sum(l: number | undefined, c: number | undefined, r: number | undefined) {
  return (l ?? 0) + (c ?? 0) + (r ?? 0);
}

export default function LayoutWidthsFieldset({
  values,
  onPatch,
}: {
  values: LayoutWidthsContent;
  onPatch: (u: Partial<LayoutWidthsContent>) => void;
}) {
  const dL = values.layout_left_pct;
  const dC = values.layout_content_pct;
  const dR = values.layout_right_pct;
  const tL = values.layout_left_pct_tablet ?? dL;
  const tC = values.layout_content_pct_tablet ?? dC;
  const tR = values.layout_right_pct_tablet ?? dR;

  return (
    <section className={sectionCls}>
      <h3 className={sectionTitleCls}>Layout widths (%)</h3>
      <p className="mb-4 text-xs text-anamaya-charcoal/60">
        Three horizontal slices: left gutter, content, right gutter. Desktop
        and tablet are set independently. Values are auto-normalised by weight,
        so non-100 totals still render correctly.
      </p>

      {/* Desktop */}
      <h4 className={subTitleCls}>Desktop (≥1024px) — total {sum(dL, dC, dR)}%</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <WidthInput label="Left gutter" value={dL} onChange={(v) => onPatch({ layout_left_pct: v })} />
        <WidthInput label="Content" value={dC} onChange={(v) => onPatch({ layout_content_pct: v })} />
        <WidthInput label="Right gutter" value={dR} onChange={(v) => onPatch({ layout_right_pct: v })} />
      </div>

      {/* Tablet */}
      <h4 className={`${subTitleCls} mt-5`}>Tablet (768–1023px) — total {sum(tL, tC, tR)}%</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <WidthInput label="Left gutter" value={values.layout_left_pct_tablet} onChange={(v) => onPatch({ layout_left_pct_tablet: v })} />
        <WidthInput label="Content" value={values.layout_content_pct_tablet} onChange={(v) => onPatch({ layout_content_pct_tablet: v })} />
        <WidthInput label="Right gutter" value={values.layout_right_pct_tablet} onChange={(v) => onPatch({ layout_right_pct_tablet: v })} />
      </div>

      <p className="mt-4 text-[11px] italic text-anamaya-charcoal/60">
        Phones (&lt;768px) always show the content full-width.
      </p>
    </section>
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
