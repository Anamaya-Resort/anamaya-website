"use client";

import { useState } from "react";
import type { PersonCardContent } from "@/types/blocks";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import RTE from "@/components/admin/rte/RichTextEditor";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function PersonCardEditor({
  content,
  onSave,
}: {
  content: PersonCardContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<PersonCardContent>(content ?? { name: "" });
  const [saving, setSaving] = useState(false);

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
      <Field label="Name">
        <input
          className={inputCls}
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
      </Field>
      <Field label="Credentials (single line)">
        <input
          className={inputCls}
          value={state.credentials ?? ""}
          onChange={(e) => setState((s) => ({ ...s, credentials: e.target.value }))}
          placeholder="RYT-500, Founder of …"
        />
      </Field>

      <div className="sm:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Photo
          </span>
          <ImageUploadButton
            value={state.photo_url}
            onUploaded={(url) => setState((s) => ({ ...s, photo_url: url }))}
            kind="person-cards"
            maxWidth={1200}
          />
        </div>
        {state.photo_url && (
          <img src={state.photo_url} alt="" className="h-32 w-32 rounded-lg object-cover" />
        )}
      </div>

      <div className="sm:col-span-2">
        <Field label="Bio (rich text)">
          <RTE
            value={state.html ?? ""}
            onChange={(html) => setState((s) => ({ ...s, html }))}
            placeholder="Their story, training, focus…"
          />
        </Field>
      </div>

      <Field label="Layout">
        <select
          className={inputCls}
          value={state.layout ?? "side-by-side"}
          onChange={(e) =>
            setState((s) => ({ ...s, layout: e.target.value as PersonCardContent["layout"] }))
          }
        >
          <option value="side-by-side">Side-by-side (photo left, text right)</option>
          <option value="stacked">Stacked (photo above, centered)</option>
        </select>
      </Field>
      {state.layout === "side-by-side" && (
        <Field label="Photo column width %">
          <input
            type="number"
            min={20}
            max={50}
            className={inputCls}
            value={state.photo_width_pct ?? 30}
            onChange={(e) =>
              setState((s) => ({ ...s, photo_width_pct: Number(e.target.value) }))
            }
          />
        </Field>
      )}

      <Field label="Link label">
        <input
          className={inputCls}
          value={state.link_label ?? ""}
          onChange={(e) => setState((s) => ({ ...s, link_label: e.target.value }))}
          placeholder="Read full bio"
        />
      </Field>
      <Field label="Link href">
        <input
          className={inputCls}
          value={state.link_href ?? ""}
          onChange={(e) => setState((s) => ({ ...s, link_href: e.target.value }))}
        />
      </Field>

      <Field label="Background color">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
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

      <div className="sm:col-span-2">
        <SectionFrameFieldset
          frame={state}
          onChange={(u) => setState((s) => ({ ...s, ...u }))}
          defaultWidth={1100}
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
