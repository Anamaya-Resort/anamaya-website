"use client";

import { useEffect, useRef, useState } from "react";
import { MODES, DEFAULT_MODE, type BuilderMode } from "@/lib/ai-site-builder/presets";

type RunResult = { text: string; prUrl: string | null; branch: string };
type UserMsg = { role: "user"; content: string };
type RunMsg = {
  role: "run";
  steps: string[];
  logs: string[];
  result?: RunResult;
  error?: string;
  done: boolean;
};
type Msg = UserMsg | RunMsg;

const SUGGESTIONS = [
  "Build a new “meet the teacher” block with a photo, name, and bio.",
  "Add an option to the testimonials block to show 2 or 3 columns.",
  "Fix the spacing on the gallery block on mobile.",
];

export default function AiSiteBuilderConsole({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<BuilderMode>(DEFAULT_MODE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const modeBlurb = MODES.find((m) => m.id === mode)?.blurb ?? "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function updateRun(fn: (r: RunMsg) => RunMsg) {
    setMessages((m) => {
      const i = m.map((x) => x.role).lastIndexOf("run");
      if (i < 0) return m;
      const copy = m.slice();
      copy[i] = fn(copy[i] as RunMsg);
      return copy;
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setMessages((m) => [
      ...m,
      { role: "user", content },
      { role: "run", steps: [], logs: [], done: false },
    ]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-site-builder/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content }], mode }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        updateRun((r) => ({ ...r, error: data?.error ?? "The builder couldn't start.", done: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: { type: string; text?: string; prUrl?: string | null; branch?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "step") updateRun((r) => ({ ...r, steps: [...r.steps, ev.text ?? ""] }));
          else if (ev.type === "log")
            updateRun((r) => ({ ...r, logs: [...r.logs, ev.text ?? ""].slice(-200) }));
          else if (ev.type === "result")
            updateRun((r) => ({
              ...r,
              done: true,
              result: { text: ev.text ?? "Done.", prUrl: ev.prUrl ?? null, branch: ev.branch ?? "" },
            }));
          else if (ev.type === "error") updateRun((r) => ({ ...r, error: ev.text ?? "Something failed.", done: true }));
        }
      }
      updateRun((r) => (r.done ? r : { ...r, done: true }));
    } catch {
      updateRun((r) => ({ ...r, error: "Lost the connection to the builder.", done: true }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
      <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">Chat with the builder</h2>
        <span
          className={`rounded-full px-2 py-[1px] text-[11px] font-medium ${
            configured ? "bg-[#edf7ed] text-[#1e7e34]" : "bg-[#fcf3e6] text-[#8a6d3b]"
          }`}
        >
          {configured ? "Connected" : "Setup pending"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#c3c4c7] bg-white px-4 py-2 text-[13px]">
        <label htmlFor="builder-mode" className="font-medium text-[#1d2327]">
          Mode
        </label>
        <select
          id="builder-mode"
          value={mode}
          disabled={busy}
          onChange={(e) => setMode(e.target.value as BuilderMode)}
          className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px] text-[#1d2327] disabled:opacity-50"
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-[#50575e]">{modeBlurb}</span>
      </div>

      {!configured && (
        <div className="border-b border-[#f0c36d] bg-[#fcf8e3] px-4 py-2.5 text-[12px] text-[#8a6d3b]">
          Not fully connected yet — the owner needs to finish a one-time setup. You can
          try it below, but it won&apos;t make real changes until then.
        </div>
      )}

      <div ref={scrollRef} className="max-h-[55vh] min-h-[14rem] overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] text-[#50575e]">Try one of these to get started:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-left text-[13px] text-[#1d2327] transition-colors hover:border-[#2271b1] hover:bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <li key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-md bg-[#2271b1] px-3 py-2 text-[13px] leading-relaxed text-white">
                    {m.content}
                  </div>
                </li>
              ) : (
                <li key={i} className="flex justify-start">
                  <div className="w-full max-w-[95%] rounded-md bg-[#f0f0f1] px-3 py-2.5 text-[13px] text-[#1d2327]">
                    <ol className="space-y-1">
                      {m.steps.map((s, j) => {
                        const isLast = j === m.steps.length - 1;
                        const pending = isLast && !m.done && !m.error;
                        return (
                          <li key={j} className="flex items-start gap-2">
                            <span className={pending ? "text-[#2271b1]" : "text-[#1e7e34]"}>
                              {pending ? "▸" : "✓"}
                            </span>
                            <span className={pending ? "text-[#1d2327]" : "text-[#50575e]"}>{s}</span>
                          </li>
                        );
                      })}
                    </ol>

                    {m.logs.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[12px] text-[#2271b1]">
                          {m.done ? "View log" : "Live log"}
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-sm bg-[#1d2327] px-2 py-1.5 text-[11px] leading-snug text-zinc-200">
                          {m.logs.slice(-80).join("\n")}
                        </pre>
                      </details>
                    )}

                    {m.result && (
                      <div className="mt-2 border-t border-[#dcdcde] pt-2">
                        <div className="font-medium text-[#1e7e34]">{m.result.text}</div>
                        {m.result.prUrl && (
                          <a
                            href={m.result.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block rounded-sm bg-[#2271b1] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#135e96]"
                          >
                            Review changes →
                          </a>
                        )}
                      </div>
                    )}

                    {m.error && (
                      <div className="mt-2 border-t border-[#f0c0c0] pt-2 text-[#b32d2e]">{m.error}</div>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-[#c3c4c7] bg-[#f6f7f7] p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Describe a change… (Enter to send, Shift+Enter for a new line)"
          className="max-h-40 min-h-[2rem] flex-1 resize-none rounded-sm border border-[#8c8f94] bg-white px-2 py-1.5 text-[13px] text-[#1d2327] outline-none placeholder:text-[#646970] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-sm bg-[#2271b1] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Working…" : "Send"}
        </button>
      </form>
    </div>
  );
}
