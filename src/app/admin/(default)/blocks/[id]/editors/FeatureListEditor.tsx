"use client";

import { useState } from "react";
import type { FeatureListContent, FeatureListItem } from "@/types/blocks";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

const ICON_OPTIONS: NonNullable<FeatureListItem["icon"]>[] = [
  "check", "star", "heart", "leaf", "sparkle", "dot",
];

export default function FeatureListEditor({
  content,
  onSave,
}: {
  content: FeatureListContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<FeatureListContent>(content ?? { items: [] });
  const [saving, setSaving] = useState(false);

  function patchItem(idx: number, patch: Partial<FeatureListItem>) {
    setState((s) => ({
      ...s,
      items: s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }
  function addItem() {
    setState((s) => ({ ...s, items: [...s.items, { title: "New item" }] }));
  }
  function removeItem(idx: number) {
    setState((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));
  }
  function moveItem(idx: number, dir: -1 | 1) {
    setState((s) => {
      const arr = [...s.items];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...s, items: arr };
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
      <Field label="Layout">
        <select
          className={inputCls}
          value={state.layout ?? "grid"}
          onChange={(e) =>
            setState((s) => ({ ...s, layout: e.target.value as FeatureListContent["layout"] }))
          }
        >
          <option value="stack">Stack (vertical list)</option>
          <option value="grid">Grid (multi-column)</option>
          <option value="split">Split (alternating image side)</option>
        </select>
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

      {state.layout === "grid" && (
        <Field label="Grid columns">
          <select
            className={inputCls}
            value={state.columns ?? 3}
            onChange={(e) =>
              setState((s) => ({ ...s, columns: Number(e.target.value) as 2 | 3 | 4 }))
            }
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </Field>
      )}
      <Field label="Background color">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
        />
      </Field>

      <div className="sm:col-span-2">
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
        <ul className="space-y-3">
          {state.items.map((item, idx) => (
            <li key={idx} className="rounded border border-zinc-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                onChange={(e) => patchItem(idx, { description: e.target.value })}
                placeholder="Description"
              />
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  className={inputCls}
                  value={item.icon ?? ""}
                  onChange={(e) =>
                    patchItem(idx, {
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
                <input
                  className={inputCls}
                  value={item.href ?? ""}
                  onChange={(e) => patchItem(idx, { href: e.target.value })}
                  placeholder="Link href (optional)"
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <ImageUploadButton
                  value={item.image_url}
                  onUploaded={(url) => patchItem(idx, { image_url: url })}
                  kind="feature-items"
                  maxWidth={1200}
                />
                {item.image_url && (
                  <img src={item.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  className="ml-auto text-xs text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  className="text-xs text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Field label="Vertical padding (px)">
        <input
          type="number"
          className={inputCls}
          value={state.padding_y_px ?? 64}
          onChange={(e) => setState((s) => ({ ...s, padding_y_px: Number(e.target.value) }))}
        />
      </Field>

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
