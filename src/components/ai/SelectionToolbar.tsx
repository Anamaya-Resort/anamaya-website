"use client";

import { useEffect, useState } from "react";
import { findSurfaceForActiveSelection } from "@/lib/ai/editor-surfaces";
import { panelStore, type PanelTab } from "@/lib/ai/panel-store";

type Position = { top: number; left: number } | null;

type ActiveSelection = {
  surfaceId: string;
  text: string;
  range: { start: number; end: number };
};

/**
 * Floating toolbar that appears above the user's text selection when the
 * selection lives inside a registered AI surface. Two buttons: AI
 * (Rewrite tab) and Headlines.
 *
 * Mounted once at the admin layout level. The store is the single
 * coordination point — clicking a button dispatches via panelStore.open()
 * and the global panel reacts.
 */
export default function SelectionToolbar() {
  const [pos, setPos] = useState<Position>(null);
  const [active, setActive] = useState<ActiveSelection | null>(null);

  useEffect(() => {
    function update() {
      const surface = findSurfaceForActiveSelection();
      if (!surface) {
        setActive(null);
        setPos(null);
        return;
      }
      const sel = surface.getSelection();
      if (!sel) {
        setActive(null);
        setPos(null);
        return;
      }
      // Position the toolbar above the textarea, near where the selection
      // began. Textareas don't expose per-character bounding rects, so we
      // anchor to the element's top edge and roughly horizontally center.
      // Flip below the field if there's no room above.
      const rect = surface.element.getBoundingClientRect();
      const TOOLBAR_H = 36;
      const above = rect.top - TOOLBAR_H - 4;
      const below = rect.bottom + 4;
      const top =
        above >= 0
          ? window.scrollY + above
          : window.scrollY + below;
      setPos({
        top,
        left: window.scrollX + rect.left + Math.min(rect.width / 2, 160),
      });
      setActive({
        surfaceId: surface.id,
        text: sel.text,
        range: { start: sel.start, end: sel.end },
      });
    }

    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!pos || !active || active.text.trim().length === 0) return null;

  const open = (tab: PanelTab) => {
    panelStore.open({
      tab,
      seedInput: active.text,
      surfaceId: active.surfaceId,
      selectionRange: active.range,
    });
  };

  return (
    <div
      role="toolbar"
      aria-label="AI tools"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-md border border-[#1d2327] bg-[#1d2327] px-1 py-1 text-[12px] text-white shadow-lg"
    >
      <button
        type="button"
        // preventDefault on mousedown keeps focus + selection in the
        // textarea. Without it, the click would blur the field, the
        // selection would collapse, and React would unmount this toolbar
        // before the click ever fires.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => open("rewrite")}
        className="rounded px-2 py-1 hover:bg-[#2c3338]"
      >
        ✦ AI
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => open("headlines")}
        className="rounded px-2 py-1 hover:bg-[#2c3338]"
      >
        Headlines
      </button>
    </div>
  );
}
