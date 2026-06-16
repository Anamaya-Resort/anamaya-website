"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Build a new “meet the teacher” block with a photo, name, and bio.",
  "Add an option to the testimonials block to show 2 or 3 columns.",
  "Fix the spacing on the gallery block on mobile.",
];

export default function AiSiteBuilderConsole({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-site-builder/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        typeof data?.reply === "string"
          ? data.reply
          : "Something went wrong reaching the builder. Please try again.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Couldn't reach the builder — check your connection and retry." },
      ]);
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

      {!configured && (
        <div className="border-b border-[#f0c36d] bg-[#fcf8e3] px-4 py-2.5 text-[12px] text-[#8a6d3b]">
          Not fully connected yet — the owner needs to finish a one-time setup. You can
          try it below, but it won&apos;t make real changes until then.
        </div>
      )}

      <div ref={scrollRef} className="max-h-[50vh] min-h-[14rem] overflow-y-auto px-4 py-4">
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
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#2271b1] text-white"
                      : "bg-[#f0f0f1] text-[#1d2327]"
                  }`}
                >
                  {m.content}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex justify-start">
                <div className="rounded-md bg-[#f0f0f1] px-3 py-2 text-[13px] text-[#646970]">
                  Working…
                </div>
              </li>
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
          Send
        </button>
      </form>
    </div>
  );
}
