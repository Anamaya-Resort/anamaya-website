"use client";

import { useEffect, useRef, useState } from "react";
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

// Always-available swatches prepended before the brand colours so
// editors can pick pure black / pure white in one click. Same hex
// flow as the Custom mode, just easier to find.
const FIXED_TEXT_SWATCHES = [
  { hex: "#000000", label: "Black" },
  { hex: "#ffffff", label: "White" },
];

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
  function makeBlankSlide(): ImageSlideshowSlide {
    return {
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
    };
  }
  /** Insert a new blank slide at the given index (0 = before first,
   *  arr.length = after last, anything in between = between rows). */
  function addSlideAt(index: number) {
    patchSlides((arr) => {
      const copy = [...arr];
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, makeBlankSlide());
      return copy;
    });
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
            <NumberInput
              min={10}
              max={100}
              className={inputCls}
              value={draft.height_vh ?? 80}
              onChange={(n) => patch({ height_vh: n })}
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
            <NumberInput
              min={0.5}
              max={60}
              step={0.5}
              className={inputCls}
              value={draft.display_seconds ?? 4}
              onChange={(n) => patch({ display_seconds: n })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Crossfade seconds</span>
            <NumberInput
              min={0}
              max={10}
              step={0.25}
              className={inputCls}
              value={draft.fade_seconds ?? 1.5}
              onChange={(n) => patch({ fade_seconds: n })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Dark overlay opacity (0–100)</span>
            <NumberInput
              min={0}
              max={100}
              className={inputCls}
              value={draft.overlay_opacity ?? 0}
              onChange={(n) => patch({ overlay_opacity: n })}
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
          controls below it. Insertion `+` buttons sit on the right gutter
          at every junction (above the first slide, between each pair,
          and below the last slide), matching the template editor's
          insert pattern. */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-anamaya-charcoal">
          Slides ({slides.length})
        </h3>
        {slides.length === 0 ? (
          <div className="relative rounded-md border border-dashed border-zinc-300 p-6 text-center">
            <p className="text-sm italic text-anamaya-charcoal/60">
              No slides yet — click the &ldquo;+&rdquo; on the right to add the first one.
            </p>
            <InsertButton
              title="Add the first slide"
              onClick={() => addSlideAt(0)}
              position="middle"
            />
          </div>
        ) : (
          <ul className="space-y-4">
            {slides.map((s, i) => (
              <li key={i} className="relative">
                {/* Top-edge insert: only on the very first slide so the
                    chain of "+ between slides" buttons stays one per
                    junction. */}
                {i === 0 && (
                  <InsertButton
                    title="Add a slide above"
                    onClick={() => addSlideAt(0)}
                    position="top"
                  />
                )}
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
                {/* Bottom-edge insert: rendered for every slide.
                    Inserts a new slide AFTER this one, so the last
                    slide's button doubles as "add at end." */}
                <InsertButton
                  title={
                    i === slides.length - 1
                      ? "Add a slide at the end"
                      : "Add a slide here"
                  }
                  onClick={() => addSlideAt(i + 1)}
                  position="bottom"
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
        <p className="mt-1.5 text-[11px] text-anamaya-charcoal/55">
          Recommended: <strong>2400 × 1350 px</strong> (16:9). Images are
          cropped from the centre to fill the slideshow area, so keep the
          subject in the middle of the frame.
        </p>
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
          <NumberInput
            min={10}
            max={240}
            className={inputCls}
            value={slide.text_size_px ?? 64}
            onChange={(n) => onUpdate({ text_size_px: n })}
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

      {/* Text color — Brand/Custom toggle + swatches on a single row,
          with Black/White prepended as the first picks. */}
      <div className="mb-4">
        <span className={labelCls}>Text color</span>
        <BrandColorSelect
          value={slide.text_color}
          onChange={(v) => onUpdate({ text_color: v })}
          brandTokens={brandTokens}
          horizontal
          allowAuto
          extraSwatches={FIXED_TEXT_SWATCHES}
        />
      </div>

      {/* Border: thickness on left, color picker on right of same row. */}
      <div>
        <span className={labelCls}>Text border (helps text stand out)</span>
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-zinc-200 bg-white p-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Thickness
            <NumberInput
              min={0}
              max={20}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
              value={slide.text_stroke_width_px ?? 0}
              onChange={(n) => onUpdate({ text_stroke_width_px: n })}
            />
            <span className="font-mono text-[10px] text-anamaya-charcoal/50">px</span>
          </label>
          <div className="h-5 w-px bg-zinc-200" />
          <BrandColorSelect
            value={slide.text_stroke_color}
            onChange={(v) => onUpdate({ text_stroke_color: v })}
            brandTokens={brandTokens}
            horizontal
            extraSwatches={FIXED_TEXT_SWATCHES}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Number input that allows free typing — including transient empty
 * states while editing — without snapping to a fallback every
 * keystroke. The previous inline `Number(e.target.value) || N` pattern
 * fought the user: backspacing to clear the field instantly forced
 * the value back to the fallback, which made it impossible to type a
 * fresh number.
 *
 * Holds a string locally; commits to the parent only when the typed
 * text parses as a finite number. On blur it clamps to min/max and
 * restores the last valid value if the field was left empty.
 */
function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [text, setText] = useState<string>(String(value));
  const lastValid = useRef<number>(value);

  // Sync from parent when the prop changes externally (e.g. another
  // edit elsewhere in the form, or an undo).
  useEffect(() => {
    if (lastValid.current !== value) {
      setText(String(value));
      lastValid.current = value;
    }
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      className={className}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "") return; // allow empty mid-edit
        const n = Number(v);
        if (Number.isFinite(n)) {
          lastValid.current = n;
          onChange(n);
        }
      }}
      onBlur={() => {
        const n = Number(text);
        if (!Number.isFinite(n)) {
          // Restore the last valid number if the field was emptied.
          setText(String(lastValid.current));
          return;
        }
        let clamped = n;
        if (typeof min === "number" && clamped < min) clamped = min;
        if (typeof max === "number" && clamped > max) clamped = max;
        if (clamped !== n) {
          setText(String(clamped));
        }
        lastValid.current = clamped;
        onChange(clamped);
      }}
    />
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

/**
 * Round "+" insert handle anchored to the right gutter of a slide
 * row, mirroring the template editor's between-rows + button.
 *   position="top"     → centred on the top edge of the parent
 *   position="bottom"  → centred on the bottom edge of the parent
 *   position="middle"  → vertically centred (used for the empty state)
 * The parent element MUST have `position: relative`.
 */
function InsertButton({
  title,
  onClick,
  position,
}: {
  title: string;
  onClick: () => void;
  position: "top" | "bottom" | "middle";
}) {
  const topStyle =
    position === "top"
      ? "0%"
      : position === "bottom"
        ? "100%"
        : "50%";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="absolute z-10 flex h-7 w-7 items-center justify-center rounded-md bg-anamaya-charcoal text-white shadow-md transition-colors hover:bg-black"
      style={{
        left: "100%",
        top: topStyle,
        transform: "translateY(-50%)",
        marginLeft: 12,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
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
