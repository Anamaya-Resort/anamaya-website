"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Public-facing chat bubble. Fetches /api/ai/agent-config on mount —
 * if the tenant has the agent disabled, renders nothing. Otherwise
 * shows a floating bubble that opens a small chat window grounded in
 * the site's content_chunks.
 *
 * Styled with the site's brand tokens (anamaya-charcoal / -green /
 * -mint / -cream) so it sits naturally inside the marketing chrome.
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Track the active fetch so closing the panel cancels it instead of
  // letting a stale answer stream into a panel the user already left.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/ai/agent-config", { cache: "no-store", signal: ctrl.signal })
      .then((r) => r.json())
      .then((c: AgentConfig) => setConfig(c))
      .catch(() => setConfig({ enabled: false }));
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  useEffect(() => {
    if (open) {
      // Defer a tick so the textarea is mounted before we focus.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    // Closing: abort any in-flight request.
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open]);

  if (!config?.enabled) return null;

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setError(null);
    setPending(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
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
      if (ctrl.signal.aborted) return;
      if (!json.ok) {
        setError(json.reason);
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: json.text, citations: json.citations },
      ]);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const reason = err instanceof Error ? err.message : "Network error";
      setError(reason);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline. Standard chat-app feel.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(draft);
    }
  }

  const hasMessages = messages.length > 0;
  const starters = config.starters ?? [];
  const brandName = config.brandName ?? "us";

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chat" : `Ask ${brandName} a question`}
        onClick={() => setOpen((o) => !o)}
        className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-anamaya-green text-white shadow-lg transition-colors hover:bg-anamaya-green-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-anamaya-green-dark focus-visible:ring-offset-2"
      >
        {open ? (
          <span aria-hidden className="text-2xl leading-none">×</span>
        ) : (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Ask ${brandName}`}
          className="fixed right-4 bottom-20 z-40 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-lg border border-anamaya-charcoal/15 bg-white font-sans text-anamaya-charcoal shadow-2xl"
        >
          <div className="flex items-center justify-between bg-anamaya-charcoal px-4 py-3 text-white">
            <span className="text-sm font-semibold tracking-wide">
              Ask {brandName}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-full px-2 text-xl leading-none text-anamaya-mint transition-colors hover:text-white"
            >
              ×
            </button>
          </div>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-anamaya-cream px-4 py-4 text-sm"
          >
            {!hasMessages && (
              <div className="space-y-3">
                <p className="text-anamaya-charcoal/80">
                  Ask anything about {brandName}. Answers come from our site —
                  if I&rsquo;m not sure, I&rsquo;ll say so.
                </p>
                {starters.length > 0 && (
                  <div className="space-y-2">
                    {starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void ask(s)}
                        className="block w-full rounded-md border border-anamaya-charcoal/15 bg-white px-3 py-2 text-left text-sm text-anamaya-charcoal transition-colors hover:border-anamaya-green hover:text-anamaya-green-dark"
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
                    ? "ml-8 rounded-2xl rounded-br-sm bg-anamaya-green px-3 py-2 text-white"
                    : "mr-8 rounded-2xl rounded-bl-sm border border-anamaya-charcoal/10 bg-white px-3 py-2 text-anamaya-charcoal"
                }
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>
                {m.role === "assistant" &&
                  m.citations &&
                  m.citations.filter((c) => c.url).length > 0 && (
                    <div className="mt-2 border-t border-anamaya-charcoal/10 pt-2 text-xs text-anamaya-charcoal/70">
                      <div className="mb-1 font-semibold">Sources</div>
                      <ul className="space-y-0.5">
                        {m.citations
                          .filter((c) => c.url)
                          .map((c, j) => (
                            <li key={j}>
                              <a
                                href={c.url ?? "#"}
                                className="text-anamaya-green underline-offset-2 hover:text-anamaya-green-dark hover:underline"
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
              <div className="mr-8 inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-anamaya-charcoal/10 bg-white px-3 py-2 text-anamaya-charcoal/70">
                <span
                  aria-hidden
                  className="h-2 w-2 animate-pulse rounded-full bg-anamaya-green"
                />
                Thinking…
              </div>
            )}

            {error && (
              <div className="rounded-md border border-anamaya-accent/40 bg-anamaya-accent/10 px-3 py-2 text-xs text-anamaya-accent">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-anamaya-charcoal/10 bg-white px-3 py-3"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a question…"
              aria-label="Your question"
              disabled={pending}
              maxLength={1000}
              className="block max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-md border border-anamaya-charcoal/15 bg-white px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green disabled:bg-anamaya-cream"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="rounded-md bg-anamaya-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-anamaya-green-dark disabled:cursor-not-allowed disabled:bg-anamaya-charcoal/30"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
