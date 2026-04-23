"use client";

import { useState } from "react";

type Kind = "rewrite" | "translate";

// Kept in sync with what the future LLM module will accept.
const TRANSLATION_LANGUAGES: { code: string; label: string }[] = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
];

/**
 * Modal for AI rewrite / AI translate. UI only — the actual LLM call
 * posts to /api/ai/rewrite (to be built when the user's LLM module
 * ships). For now that route returns a placeholder so the UI flow
 * (open → prompt → apply → close) can be tested end-to-end.
 *
 * When the LLM module lands, the only thing to change is the body of
 * that API route: take { kind, prompt, currentHtml, targetLanguage? },
 * dispatch to ChatGPT / Claude / Grok, return { html } preserving the
 * input's HTML structure.
 */
export default function AiRewriteModal({
  kind,
  currentHtml,
  onClose,
  onApply,
}: {
  kind: Kind;
  currentHtml: string;
  onClose: () => void;
  onApply: (html: string) => void;
}) {
  const [prompt, setPrompt] = useState(
    kind === "rewrite"
      ? "Rewrite this text for clarity and flow. Keep the same tone and all HTML structure intact."
      : "",
  );
  const [language, setLanguage] = useState("es");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt: kind === "translate"
            ? `Translate the HTML into ${labelFor(language)}. Preserve all tags and attributes exactly; only translate the human-visible text.`
            : prompt,
          currentHtml,
          targetLanguage: kind === "translate" ? language : undefined,
        }),
      });
      if (!res.ok) throw new Error(`AI request failed (${res.status})`);
      const data = (await res.json()) as { html?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.html) throw new Error("No HTML returned from AI");
      onApply(data.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-anamaya-charcoal">
            {kind === "rewrite" ? "AI rewrite" : "AI translate"}
          </h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded border border-zinc-300 px-2 py-1 text-[10px] uppercase tracking-wider text-anamaya-charcoal/70 hover:bg-zinc-50 disabled:opacity-50"
          >
            Close
          </button>
        </header>

        <div className="space-y-3 px-4 py-4 text-sm">
          {kind === "translate" ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
                Target language
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
              >
                {TRANSLATION_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
                Instruction
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
                placeholder="Rewrite this in a more conversational tone…"
              />
            </label>
          )}

          <p className="text-[11px] italic text-anamaya-charcoal/60">
            The AI receives the block's current HTML and should return HTML
            with the same structure. Tags, links, and images are preserved;
            only the human-visible text changes.
          </p>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy || (kind === "rewrite" && !prompt.trim())}
            className="rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
          >
            {busy
              ? kind === "rewrite" ? "Rewriting…" : "Translating…"
              : kind === "rewrite" ? "Rewrite" : "Translate"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function labelFor(code: string): string {
  return TRANSLATION_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
