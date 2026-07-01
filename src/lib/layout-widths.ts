import type { CSSProperties } from "react";

/**
 * Shared "Layout widths" model used by CTA Banner, Feature List, Featured
 * Retreats, Image Gallery and Video Showcase (mirrors Three-Column).
 *
 * Three levels, all left-gutter / content / right-gutter:
 *   - MAX CONTENT (px): the absolute pixel ceiling. `content` is the max
 *     width of the content band (0 = no cap / full width); the two gutters
 *     add fixed px side-spacing. Defaults to each block's historical
 *     hard-coded width, so nothing changes until edited.
 *   - DESKTOP (%) and TABLET (%): weighted slices that distribute the space
 *     WITHIN the Max Content band. Tablet falls back to desktop when unset.
 *
 * Phones always render the content full-width (single column). A 24px base
 * side padding is always applied so content never touches the screen edge.
 */
export type LayoutWidthsContent = {
  // Max Content — pixel ceiling.
  layout_max_content_px?: number;
  layout_max_left_gutter_px?: number;
  layout_max_right_gutter_px?: number;
  // Desktop (≥1024px) weighted % slices.
  layout_left_pct?: number;
  layout_content_pct?: number;
  layout_right_pct?: number;
  // Tablet (768–1023px) weighted % slices.
  layout_left_pct_tablet?: number;
  layout_content_pct_tablet?: number;
  layout_right_pct_tablet?: number;
};

/** Base side padding (matches the old px-6) — keeps content off the edge. */
export const LW_BASE_SIDE_PAD = 24;

function clampPct(n: number | undefined, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(0, Math.min(100, v));
}

function nonNegInt(n: number | undefined, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(0, v);
}

/** Grid track custom properties (--lw-d desktop, --lw-t tablet). */
export function layoutColVars(c: LayoutWidthsContent | undefined): CSSProperties {
  const src = c ?? {};
  const dL = clampPct(src.layout_left_pct, 0);
  const dC = clampPct(src.layout_content_pct, 100);
  const dR = clampPct(src.layout_right_pct, 0);
  const tL = clampPct(src.layout_left_pct_tablet, dL);
  const tC = clampPct(src.layout_content_pct_tablet, dC);
  const tR = clampPct(src.layout_right_pct_tablet, dR);
  return {
    ["--lw-d"]: `${dL}fr ${dC}fr ${dR}fr`,
    ["--lw-t"]: `${tL}fr ${tC}fr ${tR}fr`,
  } as CSSProperties;
}

/**
 * Outer container style from the Max Content fields. `defaultContentPx` is
 * the block's historical cap, used when the content ceiling is unset. A
 * content value of 0 means "no cap" (full width).
 */
export function layoutContainerStyle(
  c: LayoutWidthsContent | undefined,
  defaultContentPx: number,
): CSSProperties {
  const src = c ?? {};
  const rawContent = src.layout_max_content_px;
  const contentPx = rawContent === undefined ? defaultContentPx : rawContent;
  const leftG = nonNegInt(src.layout_max_left_gutter_px, 0);
  const rightG = nonNegInt(src.layout_max_right_gutter_px, 0);
  return {
    maxWidth: contentPx && contentPx > 0 ? contentPx : undefined,
    paddingLeft: LW_BASE_SIDE_PAD + leftG,
    paddingRight: LW_BASE_SIDE_PAD + rightG,
  };
}

/**
 * Defaults for a block's normalize(). Desktop 0/100/0; tablet → desktop;
 * Max Content → the block's historical cap (`defaultContentPx`), gutters 0.
 */
export function normalizeLayoutWidths(
  c: LayoutWidthsContent | null | undefined,
  defaultContentPx = 1200,
): Required<LayoutWidthsContent> {
  const src = c ?? {};
  const dL = src.layout_left_pct ?? 0;
  const dC = src.layout_content_pct ?? 100;
  const dR = src.layout_right_pct ?? 0;
  return {
    layout_max_content_px: src.layout_max_content_px ?? defaultContentPx,
    layout_max_left_gutter_px: src.layout_max_left_gutter_px ?? 0,
    layout_max_right_gutter_px: src.layout_max_right_gutter_px ?? 0,
    layout_left_pct: dL,
    layout_content_pct: dC,
    layout_right_pct: dR,
    layout_left_pct_tablet: src.layout_left_pct_tablet ?? dL,
    layout_content_pct_tablet: src.layout_content_pct_tablet ?? dC,
    layout_right_pct_tablet: src.layout_right_pct_tablet ?? dR,
  };
}
