"use client";

import { useState } from "react";

/**
 * Mobile-only slide-out for HIDDEN vertical blocks. On narrow screens the side
 * column is tucked away behind a tab on the left edge; tapping it slides the
 * column out from the left. Wrapper is `lg:hidden`, so this never shows on the
 * desktop two-column layout (where the aside is a sticky column instead).
 */
export default function TemplateAsideDrawer({
  children,
  side = "right",
}: {
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const tabEdge = side === "left" ? "left-0 rounded-r-xl" : "right-0 rounded-l-xl";
  const panelEdge = side === "left" ? "left-0" : "right-0";
  return (
    <div className="lg:hidden">
      {/* Edge tab (on the aside's side) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open details"
        className={`fixed ${tabEdge} top-1/2 z-40 -translate-y-1/2 bg-anamaya-green px-2.5 py-5 text-white shadow-lg`}
      >
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold uppercase tracking-[0.2em]">
          Details
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-anamaya-charcoal/40"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute inset-y-0 ${panelEdge} w-[86%] max-w-xs overflow-y-auto bg-anamaya-cream p-5 shadow-2xl`}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mb-4 ml-auto block rounded-full bg-white/80 px-3 py-1 text-sm text-anamaya-charcoal hover:bg-white"
            >
              Close ×
            </button>
            <div className="space-y-6">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
