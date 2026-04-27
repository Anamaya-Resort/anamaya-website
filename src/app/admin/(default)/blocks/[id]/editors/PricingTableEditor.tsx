"use client";

import { useState } from "react";
import type { PricingTableContent, PricingTier } from "@/types/blocks";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function PricingTableEditor({
  content,
  onSave,
}: {
  content: PricingTableContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<PricingTableContent>(content ?? { tiers: [] });
  const [saving, setSaving] = useState(false);

  function patchTier(idx: number, patch: Partial<PricingTier>) {
    setState((s) => ({
      ...s,
      tiers: s.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  }
  function addTier() {
    setState((s) => ({
      ...s,
      tiers: [...s.tiers, { name: "New tier", price: "", note: "" }],
    }));
  }
  function removeTier(idx: number) {
    setState((s) => ({ ...s, tiers: s.tiers.filter((_, i) => i !== idx) }));
  }
  function moveTier(idx: number, dir: -1 | 1) {
    setState((s) => {
      const arr = [...s.tiers];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...s, tiers: arr };
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
      <Field label="Heading">
        <input
          className={inputCls}
          value={state.heading ?? ""}
          onChange={(e) => setState((s) => ({ ...s, heading: e.target.value }))}
        />
      </Field>
      <Field label="Background color (brand token or hex)">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Intro text">
          <textarea
            rows={2}
            className={inputCls}
            value={state.intro ?? ""}
            onChange={(e) => setState((s) => ({ ...s, intro: e.target.value }))}
          />
        </Field>
      </div>

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
          {state.tiers.map((tier, idx) => (
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
                  placeholder="$1,800 / Sold out / Pay what you can"
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

      <Field label="Force columns (optional)">
        <select
          className={inputCls}
          value={state.columns ?? ""}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              columns: e.target.value ? (Number(e.target.value) as 1 | 2 | 3 | 4) : undefined,
            }))
          }
        >
          <option value="">Auto (one column per tier)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </Field>
      <Field label="Vertical padding (px)">
        <input
          type="number"
          className={inputCls}
          value={state.padding_y_px ?? 64}
          onChange={(e) => setState((s) => ({ ...s, padding_y_px: Number(e.target.value) }))}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Footnote">
          <input
            className={inputCls}
            value={state.footnote ?? ""}
            onChange={(e) => setState((s) => ({ ...s, footnote: e.target.value }))}
          />
        </Field>
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
