/**
 * Fluid responsive sizing — the single source of truth for turning an
 * authored pixel value into a value that scales gracefully on phones.
 *
 * THE GUARANTEE (why this can't wreck desktop):
 *   - At the DESKTOP reference width (1440px) the result equals the
 *     authored px EXACTLY. Whatever looks right today on desktop stays
 *     pixel-identical — the authored value is the hard ceiling.
 *   - At the MOBILE reference width (375px) the result equals a
 *     per-category FLOOR (a fraction of the authored value, never below
 *     an absolute readability minimum).
 *   - Between those two widths it follows a straight line. Below 375 it
 *     holds at the floor; above 1440 it holds at the ceiling.
 *
 * The line is computed from two fixed points — it is closed-form math,
 * not a hand-tuned guess — and every block calls the SAME function, so
 * scaling is consistent and can never drift block-to-block.
 *
 * Output is a CSS `clamp()` string usable directly as an inline style
 * value (fontSize, padding, gap, etc.): clamp(MIN, FLUID, MAX).
 */

const DESKTOP_REF = 1440; // px — the width block sizes are authored against
const MOBILE_REF = 375; // px — iPhone SE / most Androids; the floor anchor

export type FluidOpts = {
  /** Floor = authored × minRatio (then raised to at least minPx). */
  minRatio?: number;
  /** Absolute floor in px (readability guard). */
  minPx?: number;
  /** Hard ceiling in px. Defaults to the authored value, so desktop
   *  always renders exactly what the editor set. */
  maxPx?: number;
};

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Convert an authored px value into a fluid clamp() string.
 * Returns a plain `"<n>px"` string when there's nothing to scale
 * (zero/negative input, or floor already ≥ ceiling).
 */
export function fluid(px: number, opts: FluidOpts = {}): string {
  if (!Number.isFinite(px) || px <= 0) return `${px > 0 ? px : 0}px`;

  const max = opts.maxPx ?? px;
  const floorByRatio = px * (opts.minRatio ?? 0.7);
  const min = Math.min(max, Math.max(opts.minPx ?? 0, floorByRatio));

  // Nothing to scale (e.g. tiny value already at/under its floor).
  if (min >= max) return `${round(max)}px`;

  // Straight line through (MOBILE_REF, min) and (DESKTOP_REF, max):
  //   size(viewport) = intercept + slope × viewport
  const slope = (max - min) / (DESKTOP_REF - MOBILE_REF); // px per px of viewport
  const intercept = min - slope * MOBILE_REF; // px
  const vw = round(slope * 100); // coefficient applied to 100vw
  const b = round(intercept); // px offset

  // clamp() allows calc-style math directly in its arguments — no calc().
  const fluidExpr =
    b === 0 ? `${vw}vw` : b > 0 ? `${b}px + ${vw}vw` : `${vw}vw - ${Math.abs(b)}px`;

  return `clamp(${round(min)}px, ${fluidExpr}, ${round(max)}px)`;
}

// ── Category presets — each kind of size scales differently, because
//    they fail differently on a phone. ───────────────────────────────

/** Headings can shrink the most (≈62%), but never below 20px. */
export const fluidHeading = (px: number): string =>
  fluid(px, { minRatio: 0.62, minPx: 20 });

/** Body copy stays close to authored (≈90%) and never below 16px — the
 *  size below which mobile browsers flag "text too small / requires zoom". */
export const fluidBody = (px: number): string => fluid(px, { minRatio: 0.9, minPx: 16 });

/** Whitespace (section padding, gaps) can compress hard (≈50%) on phones. */
export const fluidSpace = (px: number): string => fluid(px, { minRatio: 0.5, minPx: 8 });
