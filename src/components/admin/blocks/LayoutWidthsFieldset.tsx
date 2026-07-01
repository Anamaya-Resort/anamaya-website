"use client";

import type { LayoutWidthsContent } from "@/lib/layout-widths";

/**
 * Editor control for the shared "Layout widths" model. Three stacked
 * groups: Max Content (px ceiling, darker sub-panel), Desktop (%) and
 * Tablet (%). Phones always render content full-width. Meant to be the
 * first section under the live preview in each block editor.
 */

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";
// Device headers — bold + one size larger so DESKTOP / TABLET stand out
// as clearly separate groups.
const deviceTitleCls =
  "mb-2 text-sm font-bold uppercase tracking-wider text-anamaya-charcoal";
// Max Content sub-panel — slightly darker than the % groups so it reads as
// the "ceiling" set apart from the two responsive groups below it.
const maxPanelCls = "mb-5 rounded-md border border-zinc-300 bg-zinc-200/70 p-3";

function pctSum(l: number | undefined, c: number | undefined, r: number | undefined) {
  return (l ?? 0) + (c ?? 0) + (r ?? 0);
}

export default function LayoutWidthsFieldset({
  values,
  onPatch,
  maxContentDefault = 1200,
}: {
  values: LayoutWidthsContent;
  onPatch: (u: Partial<LayoutWidthsContent>) => void;
  /** Block's historical cap — shown when Max Content hasn't been set. */
  maxContentDefault?: number;
}) {
  const dL = values.layout_left_pct;
  const dC = values.layout_content_pct;
  const dR = values.layout_right_pct;
  const tL = values.layout_left_pct_tablet ?? dL;
  const tC = values.layout_content_pct_tablet ?? dC;
  const tR = values.layout_right_pct_tablet ?? dR;

  const maxContent = values.layout_max_content_px ?? maxContentDefault;

  return (
    <section className={sectionCls}>
      <h3 className={sectionTitleCls}>Layout widths</h3>

      {/* Max Content — pixel ceiling (darker sub-panel). */}
      <div className={maxPanelCls}>
        <h4 className={deviceTitleCls}>Max Content (px)</h4>
        <p className="mb-3 text-[11px] text-anamaya-charcoal/60">
          The maximum size in pixels. Content = the widest the content band
          can get (set 0 for full width). Gutters add fixed side spacing.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <PxInput label="Left gutter" value={values.layout_max_left_gutter_px} fallback={0} onChange={(v) => onPatch({ layout_max_left_gutter_px: v })} />
          <PxInput label="Content" value={maxContent} fallback={maxContentDefault} onChange={(v) => onPatch({ layout_max_content_px: v })} />
          <PxInput label="Right gutter" value={values.layout_max_right_gutter_px} fallback={0} onChange={(v) => onPatch({ layout_max_right_gutter_px: v })} />
        </div>
      </div>

      <p className="mb-4 text-xs text-anamaya-charcoal/60">
        Desktop and tablet split the space inside the Max Content band. Values
        are auto-normalised by weight, so non-100 totals still render correctly.
      </p>

      {/* Desktop */}
      <h4 className={deviceTitleCls}>Desktop (≥1024px) — total {pctSum(dL, dC, dR)}%</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <PctInput label="Left gutter" value={dL} onChange={(v) => onPatch({ layout_left_pct: v })} />
        <PctInput label="Content" value={dC} onChange={(v) => onPatch({ layout_content_pct: v })} />
        <PctInput label="Right gutter" value={dR} onChange={(v) => onPatch({ layout_right_pct: v })} />
      </div>

      {/* Tablet */}
      <h4 className={`${deviceTitleCls} mt-5`}>Tablet (768–1023px) — total {pctSum(tL, tC, tR)}%</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <PctInput label="Left gutter" value={values.layout_left_pct_tablet} onChange={(v) => onPatch({ layout_left_pct_tablet: v })} />
        <PctInput label="Content" value={values.layout_content_pct_tablet} onChange={(v) => onPatch({ layout_content_pct_tablet: v })} />
        <PctInput label="Right gutter" value={values.layout_right_pct_tablet} onChange={(v) => onPatch({ layout_right_pct_tablet: v })} />
      </div>

      <p className="mt-4 text-[11px] italic text-anamaya-charcoal/60">
        Phones (&lt;768px) always show the content full-width.
      </p>
    </section>
  );
}

function PctInput({
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

function PxInput({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: number | undefined;
  fallback: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        min={0}
        max={5000}
        className={inputCls}
        value={value ?? fallback}
        onChange={(e) => onChange(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
      />
    </label>
  );
}
