"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { GalleryContent, GalleryImage } from "@/types/blocks";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function GalleryEditor({
  content,
  onSave,
}: {
  content: GalleryContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<GalleryContent>(content ?? { images: [] });
  const [saving, setSaving] = useState(false);

  function patchImage(idx: number, patch: Partial<GalleryImage>) {
    setState((s) => ({
      ...s,
      images: s.images.map((img, i) => (i === idx ? { ...img, ...patch } : img)),
    }));
  }
  function addImage(url: string) {
    setState((s) => ({ ...s, images: [...s.images, { url, alt: "" }] }));
  }
  function removeImage(idx: number) {
    setState((s) => ({ ...s, images: s.images.filter((_, i) => i !== idx) }));
  }
  function moveImage(idx: number, dir: -1 | 1) {
    setState((s) => {
      const arr = [...s.images];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...s, images: arr };
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
      <Field label="Heading (optional)">
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
            setState((s) => ({ ...s, layout: e.target.value as GalleryContent["layout"] }))
          }
        >
          <option value="grid">Grid (uniform squares)</option>
          <option value="masonry">Masonry (varied heights)</option>
          <option value="carousel">Carousel (horizontal scroll)</option>
        </select>
      </Field>
      <Field label="Columns">
        <select
          className={inputCls}
          value={state.columns ?? 3}
          onChange={(e) =>
            setState((s) => ({ ...s, columns: Number(e.target.value) as 2 | 3 | 4 | 5 }))
          }
        >
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </Field>
      <Field label="Lightbox">
        <select
          className={inputCls}
          value={state.lightbox === false ? "off" : "on"}
          onChange={(e) => setState((s) => ({ ...s, lightbox: e.target.value === "on" }))}
        >
          <option value="on">On (click to view full-size)</option>
          <option value="off">Off</option>
        </select>
      </Field>

      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Images ({state.images.length})
          </span>
          <ImageUploadButton
            label="+ Add image"
            onUploaded={addImage}
            kind="gallery"
            maxWidth={2400}
          />
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {state.images.map((img, idx) => (
            <li key={idx} className="rounded border border-zinc-200 p-2">
              <img src={img.url} alt={img.alt ?? ""} className="mb-2 h-32 w-full rounded object-cover" />
              <input
                className={`${inputCls} text-xs`}
                value={img.alt ?? ""}
                onChange={(e) => patchImage(idx, { alt: e.target.value })}
                placeholder="Alt text"
              />
              <input
                className={`${inputCls} mt-1 text-xs`}
                value={img.caption ?? ""}
                onChange={(e) => patchImage(idx, { caption: e.target.value })}
                placeholder="Caption (optional)"
              />
              <div className="mt-2 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => moveImage(idx, -1)}
                  className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(idx, 1)}
                  className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="ml-auto text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

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
          defaultWidth={1400}
        />
      </div>

      <SaveButton saving={saving} className="col-span-full justify-self-start" />
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
