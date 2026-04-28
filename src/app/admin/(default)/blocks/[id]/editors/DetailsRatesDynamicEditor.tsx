"use client";

import { useState } from "react";
import type { DetailsRatesDynamicContent, PricingTier } from "@/types/blocks";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function DetailsRatesDynamicEditor({
  content,
  onSave,
}: {
  content: DetailsRatesDynamicContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<DetailsRatesDynamicContent>(content ?? {});
  const [saving, setSaving] = useState(false);

  const tiers: PricingTier[] = state.manual_tiers ?? [];

  function patchTier(idx: number, patch: Partial<PricingTier>) {
    setState((s) => ({
      ...s,
      manual_tiers: (s.manual_tiers ?? []).map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }
  function addTier() {
    setState((s) => ({
      ...s,
      manual_tiers: [...(s.manual_tiers ?? []), { name: "New tier", price: "", note: "" }],
    }));
  }
  function removeTier(idx: number) {
    setState((s) => ({
      ...s,
      manual_tiers: (s.manual_tiers ?? []).filter((_, i) => i !== idx),
    }));
  }
  function moveTier(idx: number, dir: -1 | 1) {
    setState((s) => {
      const arr = [...(s.manual_tiers ?? [])];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...s, manual_tiers: arr };
    });
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
      className="grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2"
    >
      <Field label="Background color (brand token or hex)">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
          placeholder="brandSubtle / #F5F7ED"
        />
      </Field>
      <Field label="Text color (brand token or hex)">
        <input
          className={inputCls}
          value={state.text_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, text_color: e.target.value }))}
        />
      </Field>

      <Field label="Vertical padding (px)">
        <input
          type="number"
          className={inputCls}
          value={state.padding_y_px ?? 64}
          onChange={(e) => setState((s) => ({ ...s, padding_y_px: Number(e.target.value) }))}
        />
      </Field>
      <Field label="Left column width (%)">
        <input
          type="number"
          min={20}
          max={80}
          className={inputCls}
          value={state.left_width_pct ?? 55}
          onChange={(e) => setState((s) => ({ ...s, left_width_pct: Number(e.target.value) }))}
        />
      </Field>

      {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
      <div className="sm:col-span-2 mt-2 border-t pt-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Left column — details
        </h3>
        <Field label="Heading (left)">
          <input
            className={inputCls}
            value={state.heading_left ?? ""}
            onChange={(e) => setState((s) => ({ ...s, heading_left: e.target.value }))}
            placeholder="Retreat Details"
          />
        </Field>
        <div className="mt-3">
          <Field label="Body HTML (left)">
            <textarea
              rows={10}
              className={`${inputCls} font-mono text-xs`}
              value={state.html_left ?? ""}
              onChange={(e) => setState((s) => ({ ...s, html_left: e.target.value }))}
              placeholder={"<p>Welcome to your retreat at Anamaya…</p>\n<ul><li>Daily yoga</li>…</ul>"}
            />
          </Field>
        </div>
      </div>

      {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
      <div className="sm:col-span-2 mt-2 border-t pt-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Right column — rates
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading (right)">
            <input
              className={inputCls}
              value={state.heading_right ?? ""}
              onChange={(e) => setState((s) => ({ ...s, heading_right: e.target.value }))}
              placeholder="Rates for this Retreat"
            />
          </Field>
          <Field label="AnamayOS retreat ID (UUID)">
            <input
              className={inputCls}
              value={state.retreat_id ?? ""}
              onChange={(e) => setState((s) => ({ ...s, retreat_id: e.target.value }))}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-anamaya-charcoal/60">
          When a retreat ID is set, active pricing tiers are pulled from AnamayOS at request
          time. Tiers below are used as a fallback when AO is unreachable, returns nothing,
          or no ID is set.
        </p>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Manual / fallback tiers
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
            {tiers.map((tier, idx) => (
              <li key={idx} className="rounded border border-zinc-200 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    className={inputCls}
                    value={tier.name}
                    onChange={(e) => patchTier(idx, { name: e.target.value })}
                    placeholder="Name (e.g. Casita Single)"
                  />
                  <input
                    className={inputCls}
                    value={tier.price ?? ""}
                    onChange={(e) => patchTier(idx, { price: e.target.value })}
                    placeholder="$1,800 / Sold out"
                  />
                  <input
                    className={inputCls}
                    value={tier.note ?? ""}
                    onChange={(e) => patchTier(idx, { note: e.target.value })}
                    placeholder="Note (room type, nights, etc.)"
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

        <div className="mt-4">
          <Field label="Pricing note (footnote under tiers)">
            <input
              className={inputCls}
              value={state.pricing_note ?? ""}
              onChange={(e) => setState((s) => ({ ...s, pricing_note: e.target.value }))}
              placeholder="All prices in USD, excluding 13% IVA tax."
            />
          </Field>
        </div>
      </div>

      {/* ── CTA (below both columns) ────────────────────────────── */}
      <div className="sm:col-span-2 mt-2 rounded-md border border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[15px] font-semibold uppercase tracking-wider text-anamaya-charcoal">
            CTA button (optional)
          </h4>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!state.cta_enabled}
              onChange={(e) => setState((s) => ({ ...s, cta_enabled: e.target.checked }))}
            />
            Enabled
          </label>
        </div>
        {state.cta_enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <input
                className={inputCls}
                value={state.cta_label ?? ""}
                onChange={(e) => setState((s) => ({ ...s, cta_label: e.target.value }))}
                placeholder="Book this retreat"
              />
            </Field>
            <Field label="Link (URL)">
              <input
                className={inputCls}
                value={state.cta_href ?? ""}
                onChange={(e) => setState((s) => ({ ...s, cta_href: e.target.value }))}
                placeholder="/retreats/… or https://…"
              />
            </Field>
            <Field label="Button bg color (brand token or hex)">
              <input
                className={inputCls}
                value={state.cta_bg_color ?? ""}
                onChange={(e) => setState((s) => ({ ...s, cta_bg_color: e.target.value }))}
              />
            </Field>
            <Field label="Button text color (brand token or hex)">
              <input
                className={inputCls}
                value={state.cta_text_color ?? ""}
                onChange={(e) => setState((s) => ({ ...s, cta_text_color: e.target.value }))}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="sm:col-span-2">
        <SectionFrameFieldset
          frame={state}
          onChange={(u) => setState((s) => ({ ...s, ...u }))}
          defaultWidth={1200}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="col-span-full justify-self-start rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
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
