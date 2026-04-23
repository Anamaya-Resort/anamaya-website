"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ImageOverlayContent, ImageOverlayLine } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

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
    image_fit: c?.image_fit ?? "contain",
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
  const { draft, setDraft, commit, patch, brandTokens } = state;
  return (
    <>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={labelCls}>Image</span>
          <ImageUploadButton
            value={draft.image_url}
            onUploaded={(url) => patch({ image_url: url })}
            kind="overlays"
            maxWidth={2000}
          />
        </div>
        <input
          className={inputCls}
          value={draft.image_url ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
          onBlur={commit}
          placeholder="Paste a URL or use Upload →"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-32">
          <span className={labelCls}>Height (px)</span>
          <input
            type="number"
            min={20}
            max={1080}
            className={inputCls}
            value={draft.height_px ?? 480}
            onChange={(e) => setDraft((d) => ({ ...d, height_px: Number(e.target.value) || 20 }))}
            onBlur={commit}
          />
        </label>
        <label className="block w-32">
          <span className={labelCls}>Overlay (0-100)</span>
          <input
            type="number"
            min={0}
            max={100}
            className={inputCls}
            value={draft.overlay_opacity ?? 25}
            onChange={(e) => setDraft((d) => ({ ...d, overlay_opacity: Number(e.target.value) || 0 }))}
            onBlur={commit}
          />
        </label>
        <label className="block w-32">
          <span className={labelCls}>Alignment</span>
          <select
            className={inputCls}
            value={draft.align ?? "center"}
            onChange={(e) => patch({ align: e.target.value as ImageOverlayContent["align"] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="block w-36">
          <span className={labelCls}>Image fit</span>
          <select
            className={inputCls}
            value={draft.image_fit ?? "contain"}
            onChange={(e) => patch({ image_fit: e.target.value as ImageOverlayContent["image_fit"] })}
          >
            <option value="cover">Cover (crop to fill)</option>
            <option value="contain">Contain (show whole image)</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1.5 text-xs text-anamaya-charcoal/70">
          <input
            type="checkbox"
            checked={!!draft.image_flip_y}
            onChange={(e) => patch({ image_flip_y: e.target.checked })}
          />
          <span>Flip vertically</span>
        </label>
      </div>

      {/* Background behind the image (useful when the image has
          transparency). Auto = transparent. */}
      <div>
        <span className={labelCls}>Background color (Auto = transparent)</span>
        <BrandColorSelect
          value={draft.bg_color}
          onChange={(v) => patch({ bg_color: v })}
          brandTokens={brandTokens}
          allowAuto
        />
      </div>

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
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
        {label}
      </h4>
      <label className="block">
        <span className={labelCls}>Text</span>
        <input
          className={inputCls}
          value={line.text ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, [which]: { ...(d[which] ?? {}), text: e.target.value } }))
          }
          onBlur={commit}
          placeholder="Leave blank to hide"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Font</span>
          <BrandFontSelect value={line.font ?? "body"} onChange={(v) => updateLine({ font: v })} />
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
        <StyleToggle label="B" pressed={!!line.bold} onClick={() => updateLine({ bold: !line.bold })} bold />
        <StyleToggle label="I" pressed={!!line.italic} onClick={() => updateLine({ italic: !line.italic })} italic />
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
