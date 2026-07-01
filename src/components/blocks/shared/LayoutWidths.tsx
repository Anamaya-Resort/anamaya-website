import type { ReactNode } from "react";
import {
  layoutColVars,
  layoutContainerStyle,
  type LayoutWidthsContent,
} from "@/lib/layout-widths";

/**
 * Width authority for a block's content. Owns the centered container:
 *   - max-width + side padding from the Max Content (px) fields, and
 *   - gutter / content / gutter tracks from the Desktop/Tablet (%) fields.
 *
 * Phones: single column, content full-width (gutters hidden). Tablet uses
 * --lw-t, desktop uses --lw-d. With the defaults (Max Content = the block's
 * historical cap, %: 0/100/0) this reproduces the block's previous layout.
 *
 * `defaultMaxContentPx` is the block's historical hard-coded width, used
 * when the editor hasn't set a Max Content value. `className` is applied to
 * the outer container (e.g. "relative", "text-center").
 */
export default function LayoutWidths({
  content,
  defaultMaxContentPx = 1200,
  className,
  children,
}: {
  content: LayoutWidthsContent | undefined;
  defaultMaxContentPx?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full ${className ?? ""}`}
      style={layoutContainerStyle(content, defaultMaxContentPx)}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-[var(--lw-t)] lg:grid-cols-[var(--lw-d)]"
        style={layoutColVars(content)}
      >
        <div className="hidden md:block" aria-hidden />
        <div className="min-w-0">{children}</div>
        <div className="hidden md:block" aria-hidden />
      </div>
    </div>
  );
}
