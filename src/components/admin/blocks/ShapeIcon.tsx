/**
 * Block-shape icons. Horizontal = a wide (landscape) block that fills the main
 * column; Vertical = a tall (portrait) block built for the side column of a
 * two-column template. Inherit color via `currentColor`.
 */

export function HorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <rect x="2.5" y="6.5" width="19" height="4.2" rx="2" fill="currentColor" stroke="none" opacity="0.45" />
      <line x1="5.5" y1="14" x2="14" y2="14" strokeLinecap="round" />
    </svg>
  );
}

export function VerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden
    >
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <rect x="6.5" y="2.5" width="11" height="6" rx="2" fill="currentColor" stroke="none" opacity="0.45" />
      <line x1="9" y1="12" x2="15" y2="12" strokeLinecap="round" />
      <line x1="9" y1="15.5" x2="15" y2="15.5" strokeLinecap="round" />
    </svg>
  );
}

/** Small labeled badge used on block cards / section headers. The stored value
 *  is still "horizontal"/"vertical" (see docs/BLOCK_AREA_NOMENCLATURE.md); the
 *  user-facing labels are "Standard"/"Side". */
export function ShapeBadge({ shape }: { shape: string | null | undefined }) {
  const side = shape === "vertical";
  return (
    <span
      title={side ? "Side block (side column)" : "Standard block (main column)"}
      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 ring-1 ring-inset ring-zinc-200"
    >
      {side ? <VerticalIcon className="h-3.5 w-3.5" /> : <HorizontalIcon className="h-3.5 w-3.5" />}
      {side ? "Side" : "Standard"}
    </span>
  );
}
