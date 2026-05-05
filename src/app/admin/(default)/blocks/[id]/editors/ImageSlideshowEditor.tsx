"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type {
  ImageSlideshowContent,
  ImageSlideshowSlide,
} from "@/types/blocks";
import {
  DEFAULT_SLIDESHOW_FONT_ID,
  SLIDESHOW_FONTS,
  getSlideshowFont,
} from "@/lib/slideshow-fonts";

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
    patchSlides((arr) => [
      ...arr,
      {
        image_url: "",
        image_alt: "",
        text: "",
        text_font: DEFAULT_SLIDESHOW_FONT_ID,
        text_size_px: 64,
        text_color: "",
        text_align: "center",
        text_position: "center",
        text_bold: false,
        text_italic: false,
        text_stroke_color: "",
        text_stroke_width_px: 0,
      },
    ]);
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
      {/* Layout & timing — global, applies to the whole slideshow. */}
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
              horizontal
            />
          </label>
        </div>
      </section>

      {/* Slides — one panel per slide, with image at top + all text-overlay
          controls below it. */}
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
                  brandTokens={brandTokens}
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
  brandTokens,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number;
  total: number;
  slide: ImageSlideshowSlide;
  brandTokens: Required<OrgBranding>;
  onUpdate: (p: Partial<ImageSlideshowSlide>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const fontId = slide.text_font ?? DEFAULT_SLIDESHOW_FONT_ID;
  const fontPreview = getSlideshowFont(fontId);

  return (
    <div className={`${sectionCls} bg-white`}>
      {/* Header: slide #, reorder, remove. */}
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

      {/* Image preview + upload at top of the panel. */}
      <div className="mb-5">
        <div className="flex aspect-video w-full max-w-2xl items-center justify-center overflow-hidden rounded bg-zinc-100 ring-1 ring-zinc-200">
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
        <div className="mt-2 flex items-center gap-3">
          <ImageUploadButton
            value={slide.image_url}
            onUploaded={(u) => onUpdate({ image_url: u })}
            kind="slideshow"
            maxWidth={2400}
          />
          <input
            className={`${inputCls} max-w-md`}
            placeholder="Alt text (for screen readers)"
            value={slide.image_alt ?? ""}
            onChange={(e) => onUpdate({ image_alt: e.target.value })}
          />
        </div>
      </div>

      {/* Text overlay content. */}
      <div className="mb-4">
        <label className="block">
          <span className={labelCls}>Text overlay</span>
          <textarea
            rows={3}
            className={`${inputCls} resize-y leading-relaxed`}
            placeholder="Headline or caption shown on top of this slide…"
            value={slide.text ?? ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />
        </label>
      </div>

      {/* Font + size, then formatting row (bold, italic, alignment, position). */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Font</span>
          <select
            className={inputCls}
            value={fontId}
            onChange={(e) => onUpdate({ text_font: e.target.value })}
            style={{ fontFamily: fontPreview.family }}
          >
            {(["Sans", "Display", "Serif", "Script"] as const).map((group) => (
              <optgroup key={group} label={group}>
                {SLIDESHOW_FONTS.filter((f) => f.group === group).map((f) => (
                  <option
                    key={f.id}
                    value={f.id}
                    style={{ fontFamily: f.family }}
                  >
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Font size (px)</span>
          <input
            type="number"
            min={10}
            max={240}
            className={inputCls}
            value={slide.text_size_px ?? 64}
            onChange={(e) =>
              onUpdate({ text_size_px: Number(e.target.value) || 64 })
            }
          />
        </label>
      </div>

      {/* Bold, italic, text alignment, vertical position — all on the same row. */}
      <div className="mb-4">
        <span className={labelCls}>Formatting</span>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
          <ToggleButton
            label="Bold"
            pressed={slide.text_bold ?? false}
            onClick={() => onUpdate({ text_bold: !slide.text_bold })}
            style={{ fontWeight: 700 }}
          />
          <ToggleButton
            label="Italic"
            pressed={slide.text_italic ?? false}
            onClick={() => onUpdate({ text_italic: !slide.text_italic })}
            style={{ fontStyle: "italic" }}
          />
          <div className="mx-1 h-5 w-px bg-zinc-200" />
          <SegmentedControl
            value={slide.text_align ?? "center"}
            options={[
              { value: "left", label: "Align ⤺" },
              { value: "center", label: "Center" },
              { value: "right", label: "Align ⤻" },
            ]}
            onChange={(v) =>
              onUpdate({ text_align: v as "left" | "center" | "right" })
            }
          />
          <div className="mx-1 h-5 w-px bg-zinc-200" />
          <SegmentedControl
            value={slide.text_position ?? "center"}
            options={[
              { value: "top", label: "Top" },
              { value: "center", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
            onChange={(v) =>
              onUpdate({ text_position: v as "top" | "center" | "bottom" })
            }
          />
        </div>
      </div>

      {/* Text color — Brand/Custom toggle + swatches on a single row. */}
      <div className="mb-4">
        <span className={labelCls}>Text color</span>
        <BrandColorSelect
          value={slide.text_color}
          onChange={(v) => onUpdate({ text_color: v })}
          brandTokens={brandTokens}
          horizontal
          allowAuto
        />
      </div>

      {/* Border: thickness on left, color picker on right of same row. */}
      <div>
        <span className={labelCls}>Text border (helps text stand out)</span>
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-zinc-200 bg-white p-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Thickness
            <input
              type="number"
              min={0}
              max={20}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
              value={slide.text_stroke_width_px ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                onUpdate({
                  text_stroke_width_px: Number.isFinite(n)
                    ? Math.max(0, Math.min(20, n))
                    : 0,
                });
              }}
            />
            <span className="font-mono text-[10px] text-anamaya-charcoal/50">px</span>
          </label>
          <div className="h-5 w-px bg-zinc-200" />
          <BrandColorSelect
            value={slide.text_stroke_color}
            onChange={(v) => onUpdate({ text_stroke_color: v })}
            brandTokens={brandTokens}
            horizontal
          />
        </div>
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  pressed,
  onClick,
  style,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={style}
      className={`rounded-md px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
        pressed
          ? "bg-anamaya-charcoal text-white"
          : "bg-zinc-100 text-anamaya-charcoal/70 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-zinc-300">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-anamaya-charcoal text-white"
                : "bg-white text-anamaya-charcoal/60 hover:bg-zinc-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
