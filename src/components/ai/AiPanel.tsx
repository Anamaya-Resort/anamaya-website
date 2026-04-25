"use client";

import { panelStore, usePanelState, type PanelTab } from "@/lib/ai/panel-store";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "rewrite", label: "Rewrite" },
  { id: "write", label: "Write" },
  { id: "ask", label: "Ask" },
  { id: "headlines", label: "Headlines" },
];

/**
 * Stub AI panel. Step 3 will replace the body with the real model picker
 * + prompt UI; for now it just proves the toolbar → store → panel wiring.
 */
export default function AiPanel() {
  const state = usePanelState();
  if (!state.isOpen) return null;

  return (
    <aside
      role="dialog"
      aria-label="AI tools"
      className="fixed top-0 right-0 z-40 flex h-screen w-[380px] flex-col border-l border-[#c3c4c7] bg-white shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#1d2327] px-3 py-2 text-white">
        <span className="text-[13px] font-semibold">AI</span>
        <button
          type="button"
          onClick={() => panelStore.close()}
          aria-label="Close AI panel"
          className="rounded px-2 text-[16px] leading-none hover:bg-[#2c3338]"
        >
          ×
        </button>
      </div>

      <div className="flex border-b border-[#c3c4c7] bg-[#f6f7f7] text-[13px]">
        {TABS.map((t) => {
          const active = t.id === state.tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => panelStore.setTab(t.id)}
              className={
                "flex-1 px-2 py-2 " +
                (active
                  ? "border-b-2 border-[#2271b1] font-semibold text-[#1d2327]"
                  : "text-[#50575e] hover:text-[#1d2327]")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[13px]">
        {state.seedInput ? (
          <div>
            <div className="mb-1 text-[12px] font-semibold text-[#50575e]">
              Selection
            </div>
            <div className="max-h-40 overflow-y-auto rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1 whitespace-pre-wrap text-[#1d2327]">
              {state.seedInput}
            </div>
          </div>
        ) : (
          <p className="text-[#50575e]">
            No selection. Highlight text in an editor field to seed this panel.
          </p>
        )}

        <div className="rounded-sm border border-dashed border-[#c3c4c7] bg-[#f6f7f7] px-3 py-3 text-[12px] text-[#50575e]">
          Step 3 will hook up the model picker and the actual LLM call here.
          For now, the toolbar → store → panel plumbing is in place.
        </div>

        {state.surfaceId && (
          <div className="text-[11px] text-[#50575e]">
            Surface: <code>{state.surfaceId}</code>
            {state.selectionRange && (
              <>
                {" "}
                · Range{" "}
                <code>
                  {state.selectionRange.start}–{state.selectionRange.end}
                </code>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
