"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import ContainerFieldset from "@/components/admin/blocks/ContainerFieldset";
import MediaFieldset from "@/components/admin/blocks/MediaFieldset";
import ImageTransformFieldset from "@/components/admin/blocks/ImageTransformFieldset";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";
import RTE from "@/components/admin/rte/RichTextEditor";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RichBgContent } from "@/types/blocks";

const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "space-y-4 rounded-md border border-zinc-200 p-4";
const sectionTitleCls =
  "text-[15px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal";

function normalize(c: RichBgContent | null | undefined): RichBgContent {
  return {
    ...(c ?? {}),
    html: c?.html ?? "",
    bg_color: c?.bg_color ?? "brandSubtle",
    bg_image_url: c?.bg_image_url ?? "",
    bg_image_fit: c?.bg_image_fit ?? "cover",
    bg_image_scale_pct: c?.bg_image_scale_pct ?? 100,
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 48,
  };
}

export default function RichBgEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RichBgContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RichBgContent>
      {...props}
      typeSlug="rich_bg"
      normalize={normalize}
      renderForm={({ draft, setDraft, commit, patch, brandTokens, saving }) => (
        <>
          <ContainerFieldset
            brandTokens={brandTokens}
            paddingYPx={draft.padding_y_px}
            onPaddingYChange={(v) =>
              setDraft((d) => ({ ...d, padding_y_px: v }))
            }
            bgColor={draft.bg_color}
            onBgColorChange={(v) => patch({ bg_color: v })}
            textColor={draft.text_color}
            onTextColorChange={(v) => patch({ text_color: v })}
            onCommit={commit}
            saving={saving}
          />

          <section className={sectionCls}>
            <h3 className={sectionTitleCls}>Background Image</h3>
            <MediaFieldset
              label="Background image (optional)"
              url={draft.bg_image_url}
              onUrlChange={(url) => patch({ bg_image_url: url })}
              onCommit={commit}
              uploadKind="backgrounds"
              uploadMaxWidth={2400}
              showAlt={false}
            />
            <ImageTransformFieldset
              scale={draft.bg_image_scale_pct}
              onScaleChange={(v) => patch({ bg_image_scale_pct: v })}
              scaleMin={50}
              scaleMax={200}
              fit={draft.bg_image_fit}
              onFitChange={(v) =>
                patch({ bg_image_fit: v as RichBgContent["bg_image_fit"] })
              }
              fitOptions={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Contain" },
                { value: "tile", label: "Tile" },
              ]}
            />
            <span className="block text-[10px] text-anamaya-charcoal/50">
              Background images are decorative — no alt text needed.
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

          <SectionFrameFieldset
            frame={draft}
            onChange={(u) => patch(u)}
            defaultWidth={1200}
            onCommit={commit}
          />

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
