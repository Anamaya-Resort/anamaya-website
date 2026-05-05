"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type {
  ImageSlideshowContent,
  ImageSlideshowSlide,
} from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

function normalize(c: ImageSlideshowContent | null | undefined): ImageSlideshowContent {
  return {
    slides:                c?.slides ?? [],
    display_seconds:       c?.display_seconds ?? 4,
    fade_seconds:          c?.fade_seconds ?? 1.5,
    height_vh:             c?.height_vh ?? 80,
    image_fit:             c?.image_fit ?? "cover",
    overlay_opacity:       c?.overlay_opacity ?? 0,

    text_font:             c?.text_font ?? "heading",
    text_size_px:          c?.text_size_px ?? 56,
    text_color:            c?.text_color ?? "",
    text_align:            c?.text_align ?? "center",
    text_position:         c?.text_position ?? "center",
    text_bold:             c?.text_bold ?? false,
    text_italic:           c?.text_italic ?? false,

    text_stroke_color:     c?.text_stroke_color ?? "",
    text_stroke_width_px:  c?.text_stroke_width_px ?? 0,

    bg_color:              c?.bg_color ?? "",
  };
}

export default function ImageSlideshowEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ImageSlideshowContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ImageSlideshowContent>
      {...props}
      typeSlug="image_slideshow"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ImageSlideshowContent> }) {
  const { draft, setDraft, patch, brandTokens } = state;
  const slides = draft.slides ?? [];

  function patchSlides(fn: (arr: ImageSlideshowSlide[]) => ImageSlideshowSlide[]) {
    setDraft((d) => ({ ...d, slides: fn(d.slides ?? []) }));
  }
  function addSlide() {
    patchSlides((arr) => [...arr, { image_url: "", image_alt: "", text: "" }]);
  }
  function removeSlide(i: number) {
    patchSlides((arr) => arr.filter((_, ix) => ix !== i));
  }
  function moveSlide(i: number, delta: number) {
    patchSlides((arr) => {
      const copy = [...arr];
      const j = i + delta;
      if (j < 0 || j >= copy.length) return copy;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function updateSlide(i: number, p: Partial<ImageSlideshowSlide>) {
    patchSlides((arr) => arr.map((s, ix) => (ix === i ? { ...s, ...p } : s)));
  }

  return (
    <div className="space-y-6">
      {/* Layout & timing — global, applies to the whole slideshow.
          Sits first so the editor sees the high-level controls before
          drilling into individual slide content. */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Layout &amp; timing</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Section height (vh)</span>
            <input
              type="number"
              min={10}
              max={100}
              className={inputCls}
              value={draft.height_vh ?? 80}
              onChange={(e) =>
                patch({ height_vh: Number(e.target.value) || 80 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Image fit</span>
            <select
              className={inputCls}
              value={draft.image_fit ?? "cover"}
              onChange={(e) =>
                patch({ image_fit: e.target.value as "cover" | "contain" })
              }
            >
              <option value="cover">Cover (fills, may crop)</option>
              <option value="contain">Contain (fits, may letterbox)</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Display seconds (per slide)</span>
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              className={inputCls}
              value={draft.display_seconds ?? 4}
              onChange={(e) =>
                patch({ display_seconds: Number(e.target.value) || 4 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Crossfade seconds</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.25}
              className={inputCls}
              value={draft.fade_seconds ?? 1.5}
              onChange={(e) =>
                patch({ fade_seconds: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Dark overlay opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.overlay_opacity ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  overlay_opacity: Number.isFinite(n)
                    ? Math.max(0, Math.min(100, n))
                    : 0,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Section background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
            />
          </label>
        </div>
      </section>

      {/* Text overlay styling */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Text overlay (applies to all slides)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Font</span>
            <BrandFontSelect
              value={draft.text_font}
              onChange={(v) => patch({ text_font: v })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Font size (px)</span>
            <input
              type="number"
              min={10}
              max={200}
              className={inputCls}
              value={draft.text_size_px ?? 56}
              onChange={(e) =>
                patch({ text_size_px: Number(e.target.value) || 56 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </label>
          <div />
          <label className="block">
            <span className={labelCls}>Text alignment</span>
            <select
              className={inputCls}
              value={draft.text_align ?? "center"}
              onChange={(e) =>
                patch({
                  text_align: e.target.value as "left" | "center" | "right",
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Text vertical position</span>
            <select
              className={inputCls}
              value={draft.text_position ?? "center"}
              onChange={(e) =>
                patch({
                  text_position: e.target.value as "top" | "center" | "bottom",
                })
              }
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.text_bold ?? false}
              onChange={(e) => patch({ text_bold: e.target.checked })}
              className="h-4 w-4 accent-anamaya-green"
            />
            Bold
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.text_italic ?? false}
              onChange={(e) => patch({ text_italic: e.target.checked })}
              className="h-4 w-4 accent-anamaya-green"
            />
            Italic
          </label>
        </div>
      </section>

      {/* Text border / stroke */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Text border (helps text stand out)</h3>
        <p className="mb-3 text-xs text-anamaya-charcoal/60">
          A coloured stroke painted around each letter. Set the width to 0 to
          disable. Useful when the text colour is similar to the underlying
          image — try a contrasting border (e.g. white text + black border).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Border width (0–20 px)</span>
            <input
              type="number"
              min={0}
              max={20}
              className={inputCls}
              value={draft.text_stroke_width_px ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  text_stroke_width_px: Number.isFinite(n)
                    ? Math.max(0, Math.min(20, n))
                    : 0,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Border color</span>
            <BrandColorSelect
              value={draft.text_stroke_color}
              onChange={(v) => patch({ text_stroke_color: v })}
              brandTokens={brandTokens}
            />
          </label>
        </div>
      </section>

      {/* Per-slide panels. Each slide is its own large card with its
          image upload, alt text, text overlay and reorder controls. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-anamaya-charcoal">
            Slides ({slides.length})
          </h3>
          <button
            type="button"
            onClick={addSlide}
            className="rounded-full bg-anamaya-olive-dark px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
          >
            + Add slide
          </button>
        </div>
        {slides.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm italic text-anamaya-charcoal/60">
            No slides yet. Click &ldquo;+ Add slide&rdquo; to upload your first image.
          </p>
        ) : (
          <ul className="space-y-4">
            {slides.map((s, i) => (
              <li key={i}>
                <SlidePanel
                  index={i}
                  total={slides.length}
                  slide={s}
                  onUpdate={(p) => updateSlide(i, p)}
                  onMoveUp={() => moveSlide(i, -1)}
                  onMoveDown={() => moveSlide(i, +1)}
                  onRemove={() => removeSlide(i)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SlidePanel({
  index,
  total,
  slide,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number;
  total: number;
  slide: ImageSlideshowSlide;
  onUpdate: (p: Partial<ImageSlideshowSlide>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`${sectionCls} bg-white`}>
      {/* Header: slide number + reorder + remove buttons */}
      <header className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-anamaya-charcoal">
          Slide {index + 1}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move slide up"
            className="rounded bg-zinc-50 px-2 py-1 text-sm ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move slide down"
            className="rounded bg-zinc-50 px-2 py-1 text-sm ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 rounded-full border border-red-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
        {/* Image preview + upload */}
        <div className="space-y-2">
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-zinc-100 ring-1 ring-zinc-200">
            {slide.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs italic text-anamaya-charcoal/40">
                No image yet
              </span>
            )}
          </div>
          <div className="flex justify-center">
            <ImageUploadButton
              value={slide.image_url}
              onUploaded={(u) => onUpdate({ image_url: u })}
              kind="slideshow"
              maxWidth={2400}
            />
          </div>
        </div>

        {/* Right column: alt + text overlay */}
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Alt text (for screen readers)</span>
            <input
              className={inputCls}
              placeholder="e.g. Sunset over the yoga deck"
              value={slide.image_alt ?? ""}
              onChange={(e) => onUpdate({ image_alt: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Text overlay (optional)</span>
            <textarea
              rows={3}
              className={`${inputCls} resize-y leading-relaxed`}
              placeholder="Headline or caption shown on top of this slide…"
              value={slide.text ?? ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
            <span className="mt-1 block text-[10px] text-anamaya-charcoal/50">
              Styling (font, size, color, border) is set globally above —
              only the text content is per-slide.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
