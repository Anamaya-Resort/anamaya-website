"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Add a new “meet the teacher” block with a photo and bio.",
  "Change the wording on the retreats intro section.",
  "Fix the spacing on the testimonials block on mobile.",
];

export default function CollabConsole({ configured }: { configured: boolean }) {
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
      const res = await fetch("/api/cc/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        typeof data?.reply === "string"
          ? data.reply
          : "Something went wrong reaching the console. Please try again.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Couldn't reach the console — check your connection and retry." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-anamaya-brand-divider/30 bg-white shadow-sm">
      {!configured && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          The console isn&apos;t fully connected yet — the owner needs to finish a one-time
          setup. You can try it below, but it won&apos;t make real changes until then.
        </div>
      )}

      <div ref={scrollRef} className="max-h-[52vh] min-h-[16rem] overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-anamaya-charcoal/60">Try one of these to get started:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-anamaya-brand-divider/30 bg-anamaya-brand-subtle px-3.5 py-2.5 text-left text-sm text-anamaya-charcoal/80 transition hover:border-anamaya-brand-btn/40 hover:bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-anamaya-brand-btn text-white"
                      : "bg-anamaya-brand-subtle text-anamaya-charcoal"
                  }`}
                >
                  {m.content}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex justify-start">
                <div className="rounded-2xl bg-anamaya-brand-subtle px-4 py-2.5 text-sm text-anamaya-charcoal/50">
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
        className="flex items-end gap-2 border-t border-anamaya-brand-divider/30 bg-white p-3"
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
          className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-anamaya-brand-divider/40 bg-white px-3.5 py-2.5 text-sm text-anamaya-charcoal outline-none placeholder:text-anamaya-charcoal/40 focus:border-anamaya-brand-btn focus:ring-2 focus:ring-anamaya-brand-btn/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-anamaya-brand-btn px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-anamaya-brand-btn-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
