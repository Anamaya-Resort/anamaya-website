"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type { BlockBlendMode, TestimonialsBlockContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

const BLEND_MODES: BlockBlendMode[] = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference",
  "exclusion", "hue", "saturation", "color", "luminosity",
];

// Categories live in `testimonial_sets` (seeded by migrations 0004 +
// 0039). The editor lists them statically; new categories require a
// SQL migration anyway, so the cost of reflecting them here is minimal.
const CATEGORY_CHOICES: Array<{ slug: string; label: string }> = [
  { slug: "best_reviews",   label: "Best Reviews" },
  { slug: "homepage",       label: "Home Page" },
  { slug: "retreats",       label: "Retreats" },
  { slug: "ytt",            label: "Yoga Teacher Trainings" },
  { slug: "wellness",       label: "Wellness & Spa" },
  { slug: "surfing",        label: "Surfing" },
  { slug: "cuisine",        label: "Cuisine" },
  { slug: "accommodations", label: "Accommodations" },
  { slug: "biohacking",     label: "Biohacking" },
];

function normalize(c: TestimonialsBlockContent | null | undefined): TestimonialsBlockContent {
  return {
    category_slug:        c?.category_slug ?? "homepage",
    display_seconds:      c?.display_seconds ?? 4,
    fade_seconds:         c?.fade_seconds ?? 2,
    max_count:            c?.max_count ?? undefined,

    bg_color:             c?.bg_color ?? "",
    bg_image_url:         c?.bg_image_url ?? "",
    bg_image_opacity:     c?.bg_image_opacity ?? 100,
    bg_image_blend_mode:  c?.bg_image_blend_mode ?? "normal",

    padding_y_px:         c?.padding_y_px ?? 80,
    content_width_px:     c?.content_width_px ?? 900,

    heading:              c?.heading ?? "TESTIMONIALS",
    heading_color:        c?.heading_color ?? "",
    text_color:           c?.text_color ?? "",

    heading_size_px:      c?.heading_size_px ?? 37,
    title_size_px:        c?.title_size_px ?? 25,
    body_size_px:         c?.body_size_px ?? 19,

    show_tripadvisor_badge: c?.show_tripadvisor_badge ?? true,
  };
}

export default function TestimonialsEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: TestimonialsBlockContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<TestimonialsBlockContent>
      {...props}
      typeSlug="testimonials"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<TestimonialsBlockContent> }) {
  const { draft, patch, brandTokens } = state;

  return (
    <div className="space-y-6">
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Source</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Category</span>
            <select
              className={inputCls}
              value={draft.category_slug ?? "homepage"}
              onChange={(e) => patch({ category_slug: e.target.value })}
            >
              {CATEGORY_CHOICES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] text-anamaya-charcoal/50">
              Only testimonials marked &ldquo;Featured&rdquo; in this category will appear.
            </span>
          </label>
          <label className="block">
            <span className={labelCls}>Max testimonials (blank = all featured)</span>
            <input
              type="number"
              min={1}
              max={50}
              className={inputCls}
              value={draft.max_count ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return patch({ max_count: undefined });
                const n = Number(v);
                patch({ max_count: Number.isFinite(n) ? Math.max(1, n) : undefined });
              }}
            />
          </label>
        </div>
      </section>

      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Heading &amp; type</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Heading text</span>
            <input
              className={inputCls}
              value={draft.heading ?? "TESTIMONIALS"}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Heading color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </label>
          <label className="block">
            <span className={labelCls}>Body text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </label>
          <label className="block">
            <span className={labelCls}>Heading size (px)</span>
            <input
              type="number"
              min={10}
              max={120}
              className={inputCls}
              value={draft.heading_size_px ?? 37}
              onChange={(e) => patch({ heading_size_px: Number(e.target.value) || 37 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Review-title size (px)</span>
            <input
              type="number"
              min={10}
              max={80}
              className={inputCls}
              value={draft.title_size_px ?? 25}
              onChange={(e) => patch({ title_size_px: Number(e.target.value) || 25 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Quote-body size (px)</span>
            <input
              type="number"
              min={10}
              max={60}
              className={inputCls}
              value={draft.body_size_px ?? 19}
              onChange={(e) => patch({ body_size_px: Number(e.target.value) || 19 })}
            />
          </label>
        </div>
      </section>

      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Background</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
            />
          </label>
          <div />
          <ImageField
            label="Background image (optional)"
            url={draft.bg_image_url}
            onChange={(u) => patch({ bg_image_url: u })}
            kind="banner-bg"
          />
          <div />
          <label className="block">
            <span className={labelCls}>Image opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.bg_image_opacity ?? 100}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  bg_image_opacity: Number.isFinite(n)
                    ? Math.max(0, Math.min(100, n))
                    : 100,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Image blend mode</span>
            <select
              className={inputCls}
              value={draft.bg_image_blend_mode ?? "normal"}
              onChange={(e) =>
                patch({ bg_image_blend_mode: e.target.value as BlockBlendMode })
              }
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Layout &amp; Timing</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              min={0}
              max={400}
              className={inputCls}
              value={draft.padding_y_px ?? 80}
              onChange={(e) => patch({ padding_y_px: Number(e.target.value) || 80 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Content max width (px)</span>
            <input
              type="number"
              min={400}
              max={1600}
              className={inputCls}
              value={draft.content_width_px ?? 900}
              onChange={(e) => patch({ content_width_px: Number(e.target.value) || 900 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Display seconds (per slide)</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              className={inputCls}
              value={draft.display_seconds ?? 4}
              onChange={(e) => patch({ display_seconds: Number(e.target.value) || 4 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Crossfade seconds</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              className={inputCls}
              value={draft.fade_seconds ?? 2}
              onChange={(e) => patch({ fade_seconds: Number(e.target.value) || 2 })}
            />
          </label>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.show_tripadvisor_badge ?? true}
            onChange={(e) => patch({ show_tripadvisor_badge: e.target.checked })}
            className="h-4 w-4 accent-anamaya-green"
          />
          Show TripAdvisor 5-star badge under each testimonial
        </label>
      </section>
    </div>
  );
}

function ImageField({
  label,
  url,
  kind,
  onChange,
}: {
  label: string;
  url: string | undefined;
  kind: string;
  onChange: (url: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
        <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-zinc-100">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="max-h-12 max-w-full object-contain" />
          ) : (
            <span className="text-[10px] italic text-anamaya-charcoal/40">no image</span>
          )}
        </div>
        <ImageUploadButton
          value={url}
          onUploaded={(u) => onChange(u)}
          kind={kind}
          maxWidth={2400}
        />
        {url && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
