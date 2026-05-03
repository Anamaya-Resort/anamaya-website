"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type { CtaBannerContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "rounded-md border border-zinc-200 bg-zinc-50 p-4";
const sectionTitleCls = "mb-3 text-sm font-semibold text-anamaya-charcoal";

const BLEND_MODES: NonNullable<CtaBannerContent["bg_image_blend_mode"]>[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

function normalize(c: CtaBannerContent | null | undefined): CtaBannerContent {
  return {
    heading: c?.heading ?? "",
    subheading: c?.subheading ?? "",
    bg_color: c?.bg_color ?? "",
    bg_image_url: c?.bg_image_url ?? "",
    image_alt: c?.image_alt ?? "",
    bg_image_opacity: c?.bg_image_opacity ?? 100,
    bg_image_blend_mode: c?.bg_image_blend_mode ?? "normal",
    cta: c?.cta ?? { label: "", href: "" },
  };
}

export default function CtaBannerEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: CtaBannerContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<CtaBannerContent>
      {...props}
      typeSlug="cta_banner"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<CtaBannerContent> }) {
  const { draft, patch, brandTokens } = state;
  const cta = draft.cta ?? { label: "", href: "" };
  const opacity = draft.bg_image_opacity ?? 100;
  const blend = draft.bg_image_blend_mode ?? "normal";

  return (
    <div className="space-y-6">
      {/* Heading + subheading */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Text</h3>
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Subheading</span>
            <textarea
              rows={3}
              className={inputCls}
              value={draft.subheading ?? ""}
              onChange={(e) => patch({ subheading: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* Background */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>Background</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Shows through when the image is translucent or blended.
              Auto = anamaya-charcoal.
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className={labelCls}>Background image (optional)</span>
            <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-2">
              <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-zinc-100">
                {draft.bg_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.bg_image_url}
                    alt=""
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] italic text-anamaya-charcoal/40">
                    no image
                  </span>
                )}
              </div>
              <ImageUploadButton
                value={draft.bg_image_url}
                onUploaded={(u) => patch({ bg_image_url: u })}
                kind="cta-banners"
                maxWidth={2400}
              />
              {draft.bg_image_url && (
                <button
                  type="button"
                  onClick={() => patch({ bg_image_url: "" })}
                  className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
            <label className="mt-2 block">
              <span className={labelCls}>Alt text</span>
              <input
                className={inputCls}
                value={draft.image_alt ?? ""}
                onChange={(e) => patch({ image_alt: e.target.value })}
                placeholder="Describe the image for screen readers"
              />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Image opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={opacity}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  bg_image_opacity: Number.isFinite(n)
                    ? Math.max(0, Math.min(100, n))
                    : 100,
                });
              }}
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              100 = fully opaque. Lower lets the background color show through.
            </p>
          </label>
          <label className="block">
            <span className={labelCls}>Image blend mode</span>
            <select
              className={inputCls}
              value={blend}
              onChange={(e) =>
                patch({
                  bg_image_blend_mode: e.target
                    .value as CtaBannerContent["bg_image_blend_mode"],
                })
              }
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              CSS mix-blend-mode. &ldquo;multiply&rdquo; tints, &ldquo;screen&rdquo; lightens, etc.
            </p>
          </label>
        </div>
      </section>

      {/* CTA button */}
      <section className={sectionCls}>
        <h3 className={sectionTitleCls}>CTA button (optional)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Label</span>
            <input
              className={inputCls}
              value={cta.label ?? ""}
              onChange={(e) =>
                patch({ cta: { label: e.target.value, href: cta.href ?? "" } })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Href</span>
            <input
              className={inputCls}
              value={cta.href ?? ""}
              onChange={(e) =>
                patch({ cta: { label: cta.label ?? "", href: e.target.value } })
              }
              placeholder="/path/ or https://..."
            />
          </label>
        </div>
      </section>
    </div>
  );
}
