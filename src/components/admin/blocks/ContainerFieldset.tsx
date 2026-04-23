"use client";

import { SaveButton } from "./BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";
const sectionCls = "space-y-4 rounded-md border border-zinc-200 p-4";
const sectionTitleCls =
  "text-[15px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal";

/**
 * Generic "Container Controls" block — outer section sizing, background,
 * text color. Every field is opt-in; pass only the setters you want
 * surfaced. `children` is appended as an extra row below the size inputs
 * so editors can inject block-specific fields (e.g. image_side,
 * vertical_align) without losing the shared layout.
 *
 * When `saving` is provided, an inline SaveButton appears on the right of
 * the size-input row, saving the whole BlockEditorChrome form.
 */
export default function ContainerFieldset({
  title = "Container Controls",
  widthPx,
  onWidthChange,
  widthMin = 400,
  widthMax = 2400,
  heightPx,
  onHeightChange,
  heightMin = 0,
  heightMax = 1600,
  heightHint = "0 = auto",
  paddingYPx,
  onPaddingYChange,
  bgColor,
  onBgColorChange,
  textColor,
  onTextColorChange,
  brandTokens,
  onCommit,
  saving,
  children,
}: {
  title?: string;
  widthPx?: number;
  onWidthChange?: (v: number) => void;
  widthMin?: number;
  widthMax?: number;
  heightPx?: number;
  onHeightChange?: (v: number) => void;
  heightMin?: number;
  heightMax?: number;
  heightHint?: string;
  paddingYPx?: number;
  onPaddingYChange?: (v: number) => void;
  bgColor?: string;
  onBgColorChange?: (v: string) => void;
  textColor?: string;
  onTextColorChange?: (v: string) => void;
  brandTokens: Required<OrgBranding>;
  onCommit?: () => void;
  saving?: boolean;
  children?: React.ReactNode;
}) {
  const showWidth = !!onWidthChange;
  const showHeight = !!onHeightChange;
  const showPaddingY = !!onPaddingYChange;
  const showBg = !!onBgColorChange;
  const showText = !!onTextColorChange;
  const showSave = typeof saving === "boolean";

  return (
    <section className={sectionCls}>
      <h3 className={sectionTitleCls}>{title}</h3>

      {(showWidth || showHeight || showPaddingY || showSave) && (
        <div className="flex flex-wrap items-end gap-4">
          {showWidth && (
            <label className="block w-36">
              <span className={labelCls}>Width (px)</span>
              <input
                type="number"
                min={widthMin}
                max={widthMax}
                step={10}
                className={inputCls}
                value={widthPx ?? 0}
                onChange={(e) => onWidthChange?.(Number(e.target.value) || 0)}
                onBlur={onCommit}
              />
            </label>
          )}
          {showHeight && (
            <div className="flex items-end gap-2">
              <label className="block w-36">
                <span className={labelCls}>Height (px)</span>
                <input
                  type="number"
                  min={heightMin}
                  max={heightMax}
                  step={10}
                  className={inputCls}
                  value={heightPx ?? 0}
                  onChange={(e) => onHeightChange?.(Number(e.target.value) || 0)}
                  onBlur={onCommit}
                />
              </label>
              {heightHint && (
                <span className="pb-2 text-[11px] text-anamaya-charcoal/60">
                  {heightHint}
                </span>
              )}
            </div>
          )}
          {showPaddingY && (
            <label className="block w-32">
              <span className={labelCls}>Padding Y (px)</span>
              <input
                type="number"
                min={0}
                max={400}
                className={inputCls}
                value={paddingYPx ?? 0}
                onChange={(e) => onPaddingYChange?.(Number(e.target.value) || 0)}
                onBlur={onCommit}
              />
            </label>
          )}
          {showSave && (
            <div className="ml-auto">
              <SaveButton saving={!!saving} />
            </div>
          )}
        </div>
      )}

      {children}

      {(showBg || showText) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {showBg && (
            <div>
              <span className={labelCls}>Background color</span>
              <BrandColorSelect
                value={bgColor}
                onChange={(v) => onBgColorChange?.(v)}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
          )}
          {showText && (
            <div>
              <span className={labelCls}>Text color (Auto = inherit)</span>
              <BrandColorSelect
                value={textColor}
                onChange={(v) => onTextColorChange?.(v)}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
