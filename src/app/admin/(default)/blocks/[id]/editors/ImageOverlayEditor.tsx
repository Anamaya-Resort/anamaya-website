"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import MediaFieldset from "@/components/admin/blocks/MediaFieldset";
import ImageTransformFieldset from "@/components/admin/blocks/ImageTransformFieldset";
import ContainerFieldset from "@/components/admin/blocks/ContainerFieldset";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ImageOverlayContent, ImageOverlayLine } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "space-y-4 rounded-md border border-zinc-200 p-4";
const sectionTitleCls =
  "text-[15px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal";

function normalizeLine(l?: ImageOverlayLine): ImageOverlayLine {
  return {
    text: l?.text ?? "",
    font: l?.font ?? "body",
    size_px: l?.size_px ?? 18,
    color: l?.color ?? "brandBtnText",
    bold: !!l?.bold,
    italic: !!l?.italic,
  };
}

function normalize(c: ImageOverlayContent | null | undefined): ImageOverlayContent {
  return {
    ...(c ?? {}),
    image_url: c?.image_url ?? "",
    image_alt: c?.image_alt ?? "",
    image_fit: c?.image_fit ?? "cover",
    image_scale_pct: c?.image_scale_pct ?? 100,
    image_flip_x: !!c?.image_flip_x,
    image_flip_y: !!c?.image_flip_y,
    bg_color: c?.bg_color ?? "",
    height_px: c?.height_px ?? 480,
    overlay_opacity: c?.overlay_opacity ?? 25,
    align: c?.align ?? "center",
    line_1: normalizeLine(c?.line_1),
    line_2: normalizeLine(c?.line_2),
    line_3: normalizeLine(c?.line_3),
  };
}

export default function ImageOverlayEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ImageOverlayContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ImageOverlayContent>
      {...props}
      typeSlug="image_overlay"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ImageOverlayContent> }) {
  const { draft, setDraft, commit, patch, brandTokens, saving } = state;
  return (
    <>
      <ContainerFieldset
        brandTokens={brandTokens}
        heightPx={draft.height_px}
        onHeightChange={(v) => setDraft((d) => ({ ...d, height_px: v }))}
        heightMin={20}
        heightHint=""
        bgColor={draft.bg_color}
        onBgColorChange={(v) => patch({ bg_color: v })}
        onCommit={commit}
        saving={saving}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="block w-32">
            <span className={labelCls}>Overlay (0-100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.overlay_opacity ?? 25}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  overlay_opacity: Number(e.target.value) || 0,
                }))
              }
              onBlur={commit}
            />
          </label>
          <label className="block w-32">
            <span className={labelCls}>Alignment</span>
            <select
              className={inputCls}
              value={draft.align ?? "center"}
              onChange={(e) =>
                patch({ align: e.target.value as ImageOverlayContent["align"] })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
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
          uploadKind="overlays"
        />
        <ImageTransformFieldset
          scale={draft.image_scale_pct}
          onScaleChange={(v) => patch({ image_scale_pct: v })}
          scaleMax={200}
          fit={draft.image_fit}
          onFitChange={(v) =>
            patch({ image_fit: v as ImageOverlayContent["image_fit"] })
          }
          flipX={draft.image_flip_x}
          onFlipXChange={(v) => patch({ image_flip_x: v })}
          flipY={draft.image_flip_y}
          onFlipYChange={(v) => patch({ image_flip_y: v })}
        />
      </section>

      <LineEditor label="Line 1" state={state} which="line_1" />
      <LineEditor label="Line 2" state={state} which="line_2" />
      <LineEditor label="Line 3" state={state} which="line_3" />

      <CtaFieldset cta={draft} onChange={(u) => patch(u)} brandTokens={brandTokens} />
    </>
  );
}

function LineEditor({
  label,
  state,
  which,
}: {
  label: string;
  state: BlockEditorState<ImageOverlayContent>;
  which: "line_1" | "line_2" | "line_3";
}) {
  const { draft, setDraft, commit, patch, brandTokens } = state;
  const line = (draft[which] ?? {}) as ImageOverlayLine;

  function updateLine(u: Partial<ImageOverlayLine>) {
    patch({ [which]: { ...line, ...u } } as Partial<ImageOverlayContent>);
  }

  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <h4 className="mb-2 text-[15px] font-semibold uppercase tracking-wider text-anamaya-charcoal">
        {label}
      </h4>
      <label className="block">
        <span className={labelCls}>Text</span>
        <input
          className={inputCls}
          value={line.text ?? ""}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              [which]: { ...(d[which] ?? {}), text: e.target.value },
            }))
          }
          onBlur={commit}
          placeholder="Leave blank to hide"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Font</span>
          <BrandFontSelect
            value={line.font ?? "body"}
            onChange={(v) => updateLine({ font: v })}
          />
        </div>
        <div>
          <span className={labelCls}>Color</span>
          <BrandColorSelect
            value={line.color}
            onChange={(v) => updateLine({ color: v })}
            brandTokens={brandTokens}
          />
        </div>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <label className="block w-32">
          <span className={labelCls}>Size (px)</span>
          <input
            type="number"
            min={10}
            max={200}
            className={inputCls}
            value={line.size_px ?? 18}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                [which]: { ...(d[which] ?? {}), size_px: Number(e.target.value) || 0 },
              }))
            }
            onBlur={commit}
          />
        </label>
        <StyleToggle
          label="B"
          pressed={!!line.bold}
          onClick={() => updateLine({ bold: !line.bold })}
          bold
        />
        <StyleToggle
          label="I"
          pressed={!!line.italic}
          onClick={() => updateLine({ italic: !line.italic })}
          italic
        />
      </div>
    </section>
  );
}

function StyleToggle({
  label,
  pressed,
  onClick,
  bold,
  italic,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors ${
        pressed
          ? "border-anamaya-green bg-anamaya-green/10 text-anamaya-charcoal"
          : "border-zinc-300 bg-white text-anamaya-charcoal/70 hover:bg-zinc-50"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {label}
    </button>
  );
}
