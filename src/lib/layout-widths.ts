import type { CSSProperties } from "react";

/**
 * Shared 3-slice "Layout widths" model: left gutter / content / right
 * gutter, as weighted fr units, with independent Desktop and Tablet sets.
 * Phones always render the content full-width (single column).
 *
 * The default is 0 / 100 / 0 — content fills, no gutters — so a block that
 * has never set these renders exactly as it did before. Tablet values fall
 * back to the matching desktop value when unset.
 *
 * Used by CTA Banner, Feature List, Featured Retreats, Image Gallery and
 * Video Showcase via <LayoutWidths> (render) + <LayoutWidthsFieldset>
 * (editor). Mirrors the Three-Column widths system, with 3 slices.
 */
export type LayoutWidthsContent = {
  layout_left_pct?: number;
  layout_content_pct?: number;
  layout_right_pct?: number;
  layout_left_pct_tablet?: number;
  layout_content_pct_tablet?: number;
  layout_right_pct_tablet?: number;
};

function clampW(n: number | undefined, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(0, Math.min(100, v));
}

/** CSS custom properties (--lw-d desktop, --lw-t tablet) for the grid. */
export function layoutColVars(c: LayoutWidthsContent | undefined): CSSProperties {
  const src = c ?? {};
  const dL = clampW(src.layout_left_pct, 0);
  const dC = clampW(src.layout_content_pct, 100);
  const dR = clampW(src.layout_right_pct, 0);
  const tL = clampW(src.layout_left_pct_tablet, dL);
  const tC = clampW(src.layout_content_pct_tablet, dC);
  const tR = clampW(src.layout_right_pct_tablet, dR);
  return {
    ["--lw-d"]: `${dL}fr ${dC}fr ${dR}fr`,
    ["--lw-t"]: `${tL}fr ${tC}fr ${tR}fr`,
  } as CSSProperties;
}

/** Defaults for a block's normalize(): desktop 0/100/0, tablet → desktop. */
export function normalizeLayoutWidths(
  c: LayoutWidthsContent | null | undefined,
): Required<LayoutWidthsContent> {
  const src = c ?? {};
  const dL = src.layout_left_pct ?? 0;
  const dC = src.layout_content_pct ?? 100;
  const dR = src.layout_right_pct ?? 0;
  return {
    layout_left_pct: dL,
    layout_content_pct: dC,
    layout_right_pct: dR,
    layout_left_pct_tablet: src.layout_left_pct_tablet ?? dL,
    layout_content_pct_tablet: src.layout_content_pct_tablet ?? dC,
    layout_right_pct_tablet: src.layout_right_pct_tablet ?? dR,
  };
}
