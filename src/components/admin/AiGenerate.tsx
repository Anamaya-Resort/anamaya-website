"use client";

import { useState } from "react";

/**
 * Small admin island: a prompt box + "Generate with AI" button that calls
 * /api/ai/generate-technical and writes the result into the target textarea
 * (by id). Used on the Technical docs tabs. The surrounding <form> still
 * saves the textarea normally.
 */
export default function AiGenerate({
  docType,
  targetId,
  placeholder,
}: {
  docType: string;
  targetId: string;
  placeholder?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai/generate-technical", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docType, prompt }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.reason ?? "Generation failed");
        return;
      }
      const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (el) {
        el.value = data.text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-sm border border-[#dcdcde] bg-[#f6f7f7] p-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder ?? "Describe what to generate (optional)…"}
          className="h-7 flex-1 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
        />
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="shrink-0 rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate with AI"}
        </button>
      </div>
      {err && <p className="mt-1 text-[12px] text-[#d63638]">{err}</p>}
      <p className="mt-1 text-[12px] text-[#50575e]">
        AI fills the box above — review, edit, then Save.
      </p>
    </div>
  );
}
