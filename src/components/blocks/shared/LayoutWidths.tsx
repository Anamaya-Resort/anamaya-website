import type { ReactNode } from "react";
import { layoutColVars, type LayoutWidthsContent } from "@/lib/layout-widths";

/**
 * Wraps block content in gutter / content / gutter tracks.
 *
 * - Phones: single column — content fills (gutters hidden).
 * - Tablet (768–1023px): uses the --lw-t weighted tracks.
 * - Desktop (≥1024px): uses the --lw-d weighted tracks.
 *
 * With the default 0/100/0 the content simply fills its container, so
 * dropping this around existing block content changes nothing until an
 * editor sets gutters. Sits INSIDE a block's existing max-width container.
 */
export default function LayoutWidths({
  content,
  className,
  children,
}: {
  content: LayoutWidthsContent | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[var(--lw-t)] lg:grid-cols-[var(--lw-d)] ${className ?? ""}`}
      style={layoutColVars(content)}
    >
      <div className="hidden md:block" aria-hidden />
      <div className="min-w-0">{children}</div>
      <div className="hidden md:block" aria-hidden />
    </div>
  );
}
