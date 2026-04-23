"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import ContainerFieldset from "@/components/admin/blocks/ContainerFieldset";
import MediaFieldset from "@/components/admin/blocks/MediaFieldset";
import ImageTransformFieldset from "@/components/admin/blocks/ImageTransformFieldset";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import RTE from "@/components/admin/rte/RichTextEditor";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ImageTextContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "space-y-4 rounded-md border border-zinc-200 p-4";
const sectionTitleCls =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/60";

function normalize(c: ImageTextContent | null | undefined): ImageTextContent {
  return {
    ...(c ?? {}),
    image_url: c?.image_url ?? "",
    image_alt: c?.image_alt ?? "",
    image_side: c?.image_side ?? "left",
    image_width_pct: c?.image_width_pct ?? 50,
    image_scale_pct: c?.image_scale_pct ?? 100,
    image_flip_x: !!c?.image_flip_x,
    image_flip_y: !!c?.image_flip_y,
    container_width_px: c?.container_width_px ?? 1400,
    container_height_px: c?.container_height_px ?? 0,
    html: c?.html ?? "",
    bg_color: c?.bg_color ?? "brand",
    text_color: c?.text_color ?? "",
    vertical_align: c?.vertical_align ?? "center",
  };
}

const WIDTH_OPTIONS = [25, 33, 40, 50, 60, 67, 75];

export default function ImageTextEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ImageTextContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ImageTextContent>
      {...props}
      typeSlug="image_text"
      normalize={normalize}
      renderForm={({ draft, setDraft, commit, patch, brandTokens, saving }) => (
        <>
          <ContainerFieldset
            brandTokens={brandTokens}
            widthPx={draft.container_width_px}
            onWidthChange={(v) =>
              setDraft((d) => ({ ...d, container_width_px: v }))
            }
            heightPx={draft.container_height_px}
            onHeightChange={(v) =>
              setDraft((d) => ({ ...d, container_height_px: v }))
            }
            bgColor={draft.bg_color}
            onBgColorChange={(v) => patch({ bg_color: v })}
            textColor={draft.text_color}
            onTextColorChange={(v) => patch({ text_color: v })}
            onCommit={commit}
            saving={saving}
          >
            <div className="flex flex-wrap items-end gap-4">
              <label className="block w-40">
                <span className={labelCls}>Image side</span>
                <div className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-[11px] font-semibold uppercase tracking-wider">
                  {(["left", "right"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => patch({ image_side: s })}
                      className={`rounded-sm px-3 py-1 transition-colors ${
                        draft.image_side === s
                          ? "bg-anamaya-charcoal text-white"
                          : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block w-32">
                <span className={labelCls}>Image width %</span>
                <select
                  className={inputCls}
                  value={draft.image_width_pct ?? 50}
                  onChange={(e) =>
                    patch({ image_width_pct: Number(e.target.value) })
                  }
                >
                  {WIDTH_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}/{100 - w}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block w-32">
                <span className={labelCls}>Vertical align</span>
                <select
                  className={inputCls}
                  value={draft.vertical_align ?? "center"}
                  onChange={(e) =>
                    patch({
                      vertical_align: e.target
                        .value as ImageTextContent["vertical_align"],
                    })
                  }
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </div>
          </ContainerFieldset>

          <section className={sectionCls}>
            <h3 className={sectionTitleCls}>Image Controls</h3>
            <MediaFieldset
              url={draft.image_url}
              onUrlChange={(url) => patch({ image_url: url })}
              onCommit={commit}
              alt={draft.image_alt}
              onAltChange={(v) => setDraft((d) => ({ ...d, image_alt: v }))}
              uploadKind="split-images"
            />
            <ImageTransformFieldset
              scale={draft.image_scale_pct}
              onScaleChange={(v) => patch({ image_scale_pct: v })}
              flipX={draft.image_flip_x}
              onFlipXChange={(v) => patch({ image_flip_x: v })}
              flipY={draft.image_flip_y}
              onFlipYChange={(v) => patch({ image_flip_y: v })}
            />
            <span className="block text-[10px] text-anamaya-charcoal/50">
              Image always fits — never cropped.
            </span>
          </section>

          <div>
            <span className={labelCls}>Content</span>
            <RTE
              value={draft.html ?? ""}
              onChange={(html) => setDraft((d) => ({ ...d, html }))}
              onBlur={commit}
              placeholder="Write your content…"
            />
          </div>

          <CtaFieldset
            cta={draft}
            onChange={(u) => patch(u)}
            brandTokens={brandTokens}
          />
        </>
      )}
    />
  );
}
