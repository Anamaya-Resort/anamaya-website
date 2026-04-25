"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Public-facing chat bubble. Fetches /api/ai/agent-config on mount —
 * if the tenant has the agent disabled, renders nothing. Otherwise
 * shows a floating bubble that opens a small chat window grounded in
 * the site's content_chunks.
 */

type Citation = { title: string | null; url: string | null };

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type AgentConfig = {
  enabled: boolean;
  brandName?: string;
  starters?: string[];
};

type AskResponse =
  | { ok: true; text: string; citations: Citation[] }
  | { ok: false; reason: string };

type Props = {
  /** Optional sub-property scope so per-property pages get scoped retrieval. */
  propertyId?: string | null;
};

export default function VisitorAgent({ propertyId }: Props) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/agent-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((c: AgentConfig) => setConfig(c))
      .catch(() => setConfig({ enabled: false }));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  if (!config?.enabled) return null;

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: next.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          propertyId: propertyId ?? null,
        }),
      });
      const json = (await res.json()) as AskResponse;
      if (!json.ok) {
        setError(json.reason);
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: json.text, citations: json.citations },
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Network error";
      setError(reason);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  const hasMessages = messages.length > 0;
  const starters = config.starters ?? [];

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chat" : "Ask a question"}
        onClick={() => setOpen((o) => !o)}
        className="fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#1d2327] text-white shadow-lg hover:bg-[#2c3338]"
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Ask ${config.brandName ?? "us"}`}
          className="fixed right-4 bottom-20 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-[#c3c4c7] bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#1d2327] px-3 py-2 text-white">
            <span className="text-[13px] font-semibold">
              Ask {config.brandName ?? "us"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded px-2 text-[16px] leading-none hover:bg-[#2c3338]"
            >
              ×
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[13px]"
          >
            {!hasMessages && (
              <div className="space-y-2">
                <p className="text-[#50575e]">
                  Ask anything about {config.brandName ?? "us"}. Answers are
                  drawn from our site — if I don't know, I'll say so.
                </p>
                {starters.length > 0 && (
                  <div className="space-y-1">
                    {starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void ask(s)}
                        className="block w-full rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-1 text-left text-[12px] text-[#1d2327] hover:bg-[#eef0f1]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-md bg-[#2271b1] px-3 py-2 text-white"
                    : "mr-6 rounded-md bg-[#f6f7f7] px-3 py-2 text-[#1d2327]"
                }
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === "assistant" &&
                  m.citations &&
                  m.citations.filter((c) => c.url).length > 0 && (
                    <div className="mt-2 border-t border-[#c3c4c7] pt-2 text-[11px] text-[#50575e]">
                      <div className="mb-1 font-semibold">Sources</div>
                      <ul className="space-y-0.5">
                        {m.citations
                          .filter((c) => c.url)
                          .map((c, j) => (
                            <li key={j}>
                              <a
                                href={c.url ?? "#"}
                                className="text-[#2271b1] hover:underline"
                              >
                                {c.title ?? c.url}
                              </a>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
              </div>
            ))}

            {pending && (
              <div className="mr-6 rounded-md bg-[#f6f7f7] px-3 py-2 text-[#50575e]">
                Thinking…
              </div>
            )}

            {error && (
              <div className="rounded-sm border border-[#b32d2e] bg-[#fcf0f1] px-2 py-1 text-[12px] text-[#b32d2e]">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-[#c3c4c7] bg-white px-3 py-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a question…"
              aria-label="Your question"
              disabled={pending}
              className="h-8 flex-1 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px] focus:border-[#2271b1] focus:outline-none disabled:bg-[#f6f7f7]"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="rounded-sm bg-[#2271b1] px-3 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:bg-[#a7c4dc]"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
