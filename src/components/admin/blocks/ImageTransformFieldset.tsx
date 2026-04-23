"use client";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

export type ImageFit = "cover" | "contain";

/**
 * Scale/fit/flip controls shared across every block that renders an image.
 * Each sub-control is opt-in via a prop — blocks only surface the knobs
 * they actually support. Scale is clamped to [scaleMin, scaleMax] and
 * updated in 2% steps that feel snappy in the live preview.
 */
export default function ImageTransformFieldset({
  scale,
  onScaleChange,
  scaleStep = 2,
  scaleMin = 10,
  scaleMax = 100,
  fit,
  onFitChange,
  fitOptions,
  flipX,
  onFlipXChange,
  flipY,
  onFlipYChange,
}: {
  scale?: number;
  onScaleChange?: (pct: number) => void;
  scaleStep?: number;
  scaleMin?: number;
  scaleMax?: number;
  fit?: string;
  onFitChange?: (v: string) => void;
  /** Options for the fit select; defaults to cover/contain. */
  fitOptions?: Array<{ value: string; label: string }>;
  flipX?: boolean;
  onFlipXChange?: (v: boolean) => void;
  flipY?: boolean;
  onFlipYChange?: (v: boolean) => void;
}) {
  const hasScale = typeof scale === "number" && !!onScaleChange;
  const hasFit = !!onFitChange;
  const hasFlipX = !!onFlipXChange;
  const hasFlipY = !!onFlipYChange;
  if (!hasScale && !hasFit && !hasFlipX && !hasFlipY) return null;

  const clamped = hasScale
    ? Math.max(scaleMin, Math.min(scaleMax, scale ?? scaleMax))
    : scaleMax;
  const bump = (delta: number) => {
    if (!onScaleChange) return;
    onScaleChange(Math.max(scaleMin, Math.min(scaleMax, clamped + delta)));
  };

  const options = fitOptions ?? [
    { value: "cover", label: "Cover (crop to fill)" },
    { value: "contain", label: "Contain (show whole image)" },
  ];

  return (
    <div className="flex flex-wrap items-end gap-4">
      {hasScale && (
        <div>
          <span className={labelCls}>Scale</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => bump(-scaleStep)}
              disabled={clamped <= scaleMin}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-40"
            >
              −{scaleStep}%
            </button>
            <button
              type="button"
              onClick={() => onScaleChange?.(100)}
              title="Reset to 100%"
              className="min-w-[3.5rem] rounded px-1 py-0.5 text-center font-mono text-sm tabular-nums text-anamaya-charcoal hover:bg-zinc-100"
            >
              {clamped}%
            </button>
            <button
              type="button"
              onClick={() => bump(scaleStep)}
              disabled={clamped >= scaleMax}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-40"
            >
              +{scaleStep}%
            </button>
          </div>
        </div>
      )}
      {hasFit && (
        <label className="block w-44">
          <span className={labelCls}>Fit</span>
          <select
            className={inputCls}
            value={fit ?? options[0]?.value ?? "cover"}
            onChange={(e) => onFitChange?.(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {(hasFlipX || hasFlipY) && (
        <div className="flex items-end gap-3 pb-1.5">
          {hasFlipX && (
            <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
              <input
                type="checkbox"
                checked={!!flipX}
                onChange={(e) => onFlipXChange?.(e.target.checked)}
              />
              <span>Flip horizontal</span>
            </label>
          )}
          {hasFlipY && (
            <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
              <input
                type="checkbox"
                checked={!!flipY}
                onChange={(e) => onFlipYChange?.(e.target.checked)}
              />
              <span>Flip vertical</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compose a CSS transform string from flip flags. Centralised so
 * renderers stay consistent.
 */
export function flipTransform(flipX?: boolean, flipY?: boolean): string | undefined {
  if (!flipX && !flipY) return undefined;
  const parts: string[] = [];
  if (flipX) parts.push("scaleX(-1)");
  if (flipY) parts.push("scaleY(-1)");
  return parts.join(" ");
}
