"use client";

import { useState } from "react";
import type { PressBarContent, PressBarLogo } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

function emptyLogo(): PressBarLogo {
  return { name: "", src: "", width: 100, height: 30, href: null, featured: false };
}

export default function PressBarEditor({
  content,
  onSave,
}: {
  content: PressBarContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [heading, setHeading] = useState(content?.heading ?? "Recommended by:");
  const [widths, setWidths] = useState<number[]>(content?.column_widths_pct ?? []);
  const [logos, setLogos] = useState<PressBarLogo[]>(content?.logos ?? []);
  const [saving, setSaving] = useState(false);

  function updateLogo(i: number, patch: Partial<PressBarLogo>) {
    setLogos((arr) => arr.map((l, ix) => (ix === i ? { ...l, ...patch } : l)));
  }
  function moveLogo(i: number, delta: number) {
    setLogos((arr) => {
      const copy = [...arr];
      const j = i + delta;
      if (j < 0 || j >= copy.length) return copy;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function removeLogo(i: number) {
    setLogos((arr) => arr.filter((_, ix) => ix !== i));
  }

  return (
    <form
      action={async () => {
        setSaving(true);
        try {
          await onSave({
            heading,
            column_widths_pct: widths.length === logos.length ? widths : undefined,
            logos,
          });
        } finally {
          setSaving(false);
        }
      }}
      className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Heading
        </span>
        <input className={inputCls} value={heading} onChange={(e) => setHeading(e.target.value)} />
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          Column widths (% per logo, comma-separated, must sum to 100)
        </span>
        <input
          className={inputCls}
          placeholder="e.g. 10,10,10,10,20,10,10,10,10"
          value={widths.join(",")}
          onChange={(e) => {
            const parts = e.target.value
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n));
            setWidths(parts);
          }}
        />
        <span className="mt-1 block text-[10px] text-anamaya-charcoal/50">
          Leave blank or empty to use equal column widths.
        </span>
      </label>

      <section className="mt-6">
        <header className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Logos ({logos.length})
          </h3>
          <button
            type="button"
            onClick={() => setLogos((a) => [...a, emptyLogo()])}
            className="rounded-full bg-anamaya-olive-dark px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
          >
            + Add logo
          </button>
        </header>
        <div className="space-y-3">
          {logos.map((logo, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-200"
            >
              {/* Preview thumbnail */}
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-white ring-1 ring-zinc-200">
                {logo.src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.src} alt="" className="h-full w-full object-contain" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Name" value={logo.name} onChange={(e) => updateLogo(i, { name: e.target.value })} />
                <input className={inputCls} placeholder="Image URL (/press/…)" value={logo.src} onChange={(e) => updateLogo(i, { src: e.target.value })} />
                <input className={inputCls} placeholder="Article URL (blank = no link)" value={logo.href ?? ""} onChange={(e) => updateLogo(i, { href: e.target.value || null })} />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" className={inputCls} placeholder="width" value={logo.width} onChange={(e) => updateLogo(i, { width: Number(e.target.value) || 0 })} />
                  <input type="number" className={inputCls} placeholder="height" value={logo.height} onChange={(e) => updateLogo(i, { height: Number(e.target.value) || 0 })} />
                  <label className="flex items-center gap-1.5 text-xs text-anamaya-charcoal/70">
                    <input type="checkbox" checked={!!logo.featured} onChange={(e) => updateLogo(i, { featured: e.target.checked })} />
                    featured
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => moveLogo(i, -1)} className="rounded bg-white px-2 py-1 text-xs ring-1 ring-zinc-300 hover:bg-zinc-100" disabled={i === 0}>↑</button>
                <button type="button" onClick={() => moveLogo(i, +1)} className="rounded bg-white px-2 py-1 text-xs ring-1 ring-zinc-300 hover:bg-zinc-100" disabled={i === logos.length - 1}>↓</button>
                <button type="button" onClick={() => removeLogo(i)} className="rounded bg-white px-2 py-1 text-xs text-red-600 ring-1 ring-zinc-300 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
