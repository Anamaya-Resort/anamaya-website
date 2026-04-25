"use client";

import { useEffect, useMemo, useState } from "react";
import { getSurface } from "@/lib/ai/editor-surfaces";
import { panelStore, usePanelState, type PanelTab } from "@/lib/ai/panel-store";
import ModelPicker from "./ModelPicker";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "rewrite", label: "Rewrite" },
  { id: "write", label: "Write" },
  { id: "ask", label: "Ask" },
  { id: "headlines", label: "Headlines" },
];

type ChatRun =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; text: string }
  | { status: "error"; reason: string };

type HeadlinesRun =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; headlines: string[] }
  | { status: "error"; reason: string };

export default function AiPanel() {
  const state = usePanelState();
  const [modelRef, setModelRef] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [chatRun, setChatRun] = useState<ChatRun>({ status: "idle" });
  const [headlinesRun, setHeadlinesRun] = useState<HeadlinesRun>({ status: "idle" });

  const isChatTab =
    state.tab === "rewrite" || state.tab === "write" || state.tab === "ask";
  const isHeadlinesTab = state.tab === "headlines";

  // Reset transient state whenever a new selection / tab is opened.
  useEffect(() => {
    setInstruction("");
    setChatRun({ status: "idle" });
    setHeadlinesRun({ status: "idle" });
  }, [state.seedInput, state.tab, state.surfaceId]);

  const placeholder = useMemo(() => instructionPlaceholder(state.tab), [state.tab]);

  if (!state.isOpen) return null;

  const canSubmitChat =
    isChatTab &&
    !!modelRef &&
    chatRun.status !== "running" &&
    (state.tab === "rewrite"
      ? !!state.seedInput.trim()
      : !!instruction.trim());

  const canSubmitHeadlines =
    isHeadlinesTab &&
    !!modelRef &&
    !!state.seedInput.trim() &&
    headlinesRun.status !== "running";

  async function submitChat() {
    if (!modelRef || !isChatTab) return;
    setChatRun({ status: "running" });
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRef,
          mode: state.tab,
          instruction,
          selection: state.seedInput,
          propertyId: getPropertyIdFromSurface(state.surfaceId),
          pageContext: getPageContextFromSurface(state.surfaceId),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; text: string }
        | { ok: false; reason: string };
      if (!json.ok) {
        setChatRun({ status: "error", reason: json.reason });
        return;
      }
      setChatRun({ status: "ok", text: json.text });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Network error";
      setChatRun({ status: "error", reason });
    }
  }

  async function submitHeadlines() {
    if (!modelRef || !isHeadlinesTab) return;
    setHeadlinesRun({ status: "running" });
    try {
      const res = await fetch("/api/ai/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRef,
          selection: state.seedInput,
          instruction,
          propertyId: getPropertyIdFromSurface(state.surfaceId),
          pageContext: getPageContextFromSurface(state.surfaceId),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; headlines: string[] }
        | { ok: false; reason: string };
      if (!json.ok) {
        setHeadlinesRun({ status: "error", reason: json.reason });
        return;
      }
      setHeadlinesRun({ status: "ok", headlines: json.headlines });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Network error";
      setHeadlinesRun({ status: "error", reason });
    }
  }

  function applyToSelection(text: string) {
    if (!state.surfaceId) return;
    const surface = getSurface(state.surfaceId);
    if (!surface) return;
    if (state.selectionRange) {
      surface.replaceRange(
        state.selectionRange.start,
        state.selectionRange.end,
        text,
      );
    } else {
      surface.insertAtCursor(text);
    }
    panelStore.close();
  }

  function insertAtCursor(text: string) {
    if (!state.surfaceId) return;
    const surface = getSurface(state.surfaceId);
    if (!surface) return;
    surface.insertAtCursor(text);
    panelStore.close();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <aside
      role="dialog"
      aria-label="AI tools"
      className="fixed top-0 right-0 z-40 flex h-screen w-[420px] flex-col border-l border-[#c3c4c7] bg-white shadow-lg"
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
        {isChatTab && (
          <>
            {state.seedInput ? (
              <div>
                <div className="mb-1 text-[12px] font-semibold text-[#50575e]">
                  Selection
                </div>
                <div className="max-h-32 overflow-y-auto rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1 whitespace-pre-wrap text-[#1d2327]">
                  {state.seedInput}
                </div>
              </div>
            ) : state.tab === "rewrite" ? (
              <p className="text-[#b32d2e]">
                No selection. Highlight text first, then click ✦ AI.
              </p>
            ) : null}

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                Model
              </label>
              <ModelPicker kind="text" value={modelRef} onChange={setModelRef} />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                {state.tab === "ask" ? "Question" : "Instruction"}
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                placeholder={placeholder}
                className="block w-full resize-y rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px] focus:border-[#2271b1] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={submitChat}
                disabled={!canSubmitChat}
                className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:bg-[#a7c4dc]"
              >
                {chatRun.status === "running" ? "Running…" : chatRunLabel(state.tab)}
              </button>
              {chatRun.status === "ok" && (
                <button
                  type="button"
                  onClick={() => setChatRun({ status: "idle" })}
                  className="text-[12px] text-[#2271b1] hover:underline"
                >
                  Try again
                </button>
              )}
            </div>

            {chatRun.status === "error" && (
              <div className="rounded-sm border border-[#b32d2e] bg-[#fcf0f1] px-2 py-2 text-[12px] text-[#b32d2e]">
                {chatRun.reason}
              </div>
            )}

            {chatRun.status === "ok" && (
              <div>
                <div className="mb-1 text-[12px] font-semibold text-[#50575e]">
                  Result
                </div>
                <div className="max-h-64 overflow-y-auto rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1 whitespace-pre-wrap text-[#1d2327]">
                  {chatRun.text}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state.surfaceId && state.selectionRange && state.tab !== "ask" && (
                    <button
                      type="button"
                      onClick={() => applyToSelection(chatRun.text)}
                      className="rounded-sm bg-[#2271b1] px-2 py-1 text-[12px] font-medium text-white hover:bg-[#135e96]"
                    >
                      Replace selection
                    </button>
                  )}
                  {state.surfaceId && state.tab !== "ask" && (
                    <button
                      type="button"
                      onClick={() => insertAtCursor(chatRun.text)}
                      className="rounded-sm border border-[#2271b1] px-2 py-1 text-[12px] font-medium text-[#2271b1] hover:bg-[#f6f7f7]"
                    >
                      Insert at cursor
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copy(chatRun.text)}
                    className="rounded-sm border border-[#8c8f94] px-2 py-1 text-[12px] text-[#1d2327] hover:bg-[#f6f7f7]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isHeadlinesTab && (
          <>
            {state.seedInput ? (
              <div>
                <div className="mb-1 text-[12px] font-semibold text-[#50575e]">
                  Current headline / passage
                </div>
                <div className="max-h-32 overflow-y-auto rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1 whitespace-pre-wrap text-[#1d2327]">
                  {state.seedInput}
                </div>
              </div>
            ) : (
              <p className="text-[#b32d2e]">
                No selection. Highlight a headline or passage first, then click
                Headlines.
              </p>
            )}

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                Model
              </label>
              <ModelPicker kind="text" value={modelRef} onChange={setModelRef} />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                Style guidance (optional)
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
                placeholder="e.g. punchier, more SEO-friendly, lean into curiosity"
                className="block w-full resize-y rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px] focus:border-[#2271b1] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={submitHeadlines}
                disabled={!canSubmitHeadlines}
                className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:bg-[#a7c4dc]"
              >
                {headlinesRun.status === "running"
                  ? "Generating…"
                  : "Generate 10 headlines"}
              </button>
              {headlinesRun.status === "ok" && (
                <button
                  type="button"
                  onClick={() => setHeadlinesRun({ status: "idle" })}
                  className="text-[12px] text-[#2271b1] hover:underline"
                >
                  Try again
                </button>
              )}
            </div>

            {headlinesRun.status === "error" && (
              <div className="rounded-sm border border-[#b32d2e] bg-[#fcf0f1] px-2 py-2 text-[12px] text-[#b32d2e]">
                {headlinesRun.reason}
              </div>
            )}

            {headlinesRun.status === "ok" && (
              <div className="space-y-2">
                <div className="text-[12px] font-semibold text-[#50575e]">
                  Alternatives ({headlinesRun.headlines.length})
                </div>
                <ol className="space-y-2">
                  {headlinesRun.headlines.map((h, i) => (
                    <li
                      key={i}
                      className="rounded-sm border border-[#c3c4c7] bg-white px-2 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-[1px] shrink-0 text-[11px] text-[#50575e]">
                          {i + 1}.
                        </span>
                        <div className="min-w-0 flex-1 break-words text-[#1d2327]">
                          {h}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 pl-5">
                        {state.surfaceId && state.selectionRange && (
                          <button
                            type="button"
                            onClick={() => applyToSelection(h)}
                            className="rounded-sm bg-[#2271b1] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#135e96]"
                          >
                            Use this
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => copy(h)}
                          className="rounded-sm border border-[#8c8f94] px-2 py-1 text-[11px] text-[#1d2327] hover:bg-[#f6f7f7]"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function instructionPlaceholder(tab: PanelTab): string {
  switch (tab) {
    case "rewrite":
      return "Make it tighter and more vivid. Optional — leave blank for a default rewrite.";
    case "write":
      return "Describe the passage you want written.";
    case "ask":
      return "Ask a question about the selection or page.";
    default:
      return "";
  }
}

function chatRunLabel(tab: PanelTab): string {
  if (tab === "rewrite") return "Rewrite";
  if (tab === "write") return "Write";
  if (tab === "ask") return "Ask";
  return "Run";
}

function getPageContextFromSurface(
  surfaceId: string | null,
): Record<string, unknown> | null {
  if (!surfaceId) return null;
  const surface = getSurface(surfaceId);
  if (!surface?.getPageContext) return null;
  try {
    return surface.getPageContext();
  } catch {
    return null;
  }
}

function getPropertyIdFromSurface(surfaceId: string | null): string | null {
  const ctx = getPageContextFromSurface(surfaceId);
  if (!ctx) return null;
  const v = ctx["propertyId"];
  return typeof v === "string" && v.length > 0 ? v : null;
}
