"use client";

import { useState } from "react";
import type { HeroContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function HeroEditor({
  content,
  onSave,
}: {
  content: HeroContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<HeroContent>(content ?? {});
  const [saving, setSaving] = useState(false);

  function field<K extends keyof HeroContent>(key: K, value: HeroContent[K]) {
    setState((s) => ({ ...s, [key]: value }));
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
      <Field label="Title">
        <input className={inputCls} value={state.title ?? ""} onChange={(e) => field("title", e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <input className={inputCls} value={state.subtitle ?? ""} onChange={(e) => field("subtitle", e.target.value)} />
      </Field>
      <Field label="Image URL">
        <input className={inputCls} value={state.image_url ?? ""} onChange={(e) => field("image_url", e.target.value)} />
      </Field>
      <Field label="YouTube video id (desktop)">
        <input className={inputCls} value={state.video_youtube_id ?? ""} onChange={(e) => field("video_youtube_id", e.target.value)} />
      </Field>
      <Field label="Video poster image URL">
        <input className={inputCls} value={state.video_poster_url ?? ""} onChange={(e) => field("video_poster_url", e.target.value)} />
      </Field>
      <Field label="Height (vh)">
        <input type="number" min={20} max={100} className={inputCls} value={state.height_vh ?? 80} onChange={(e) => field("height_vh", Number(e.target.value) || 80)} />
      </Field>
      <Field label="Overlay darkness (0-100)">
        <input type="number" min={0} max={100} className={inputCls} value={state.overlay_opacity ?? 20} onChange={(e) => field("overlay_opacity", Number(e.target.value) || 0)} />
      </Field>
      <Field label="CTA label">
        <input className={inputCls} value={state.cta?.label ?? ""} onChange={(e) => field("cta", { label: e.target.value, href: state.cta?.href ?? "" })} />
      </Field>
      <Field label="CTA href">
        <input className={inputCls} value={state.cta?.href ?? ""} onChange={(e) => field("cta", { label: state.cta?.label ?? "", href: e.target.value })} />
      </Field>

      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50 sm:col-span-2"
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
