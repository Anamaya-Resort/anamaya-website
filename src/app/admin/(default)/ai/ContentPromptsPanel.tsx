"use client";

import { useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOContentPrompt } from "@/types/ao-ai";

const CATEGORY_LABELS: Record<string, string> = {
  article: "Article",
  ad_copy: "Ad Copy",
  video_script: "Video Script",
  ab_test: "A/B Test",
  schema: "Schema",
};

/** Highlights {{variable}} tokens in amber. */
function TemplateText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <pre className="max-h-48 overflow-y-auto rounded-md bg-zinc-50 p-3 text-xs leading-relaxed text-anamaya-charcoal/80 whitespace-pre-wrap font-mono">
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span key={i} className="rounded bg-amber-100 px-0.5 text-amber-700 font-semibold">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </pre>
  );
}

function PromptCard({ prompt }: { prompt: AOContentPrompt }) {
  const [expanded, setExpanded] = useState(false);
  const catLabel = CATEGORY_LABELS[prompt.category] ?? prompt.category;
  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anamaya-charcoal">{prompt.name}</h3>
            <span className="rounded-full bg-anamaya-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-green">
              {catLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
        >
          {expanded ? "Close ▲" : "Open ▼"}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3">
          {prompt.system_prompt && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/50">
                System Prompt
              </div>
              <TemplateText text={prompt.system_prompt} />
            </div>
          )}
          {prompt.user_prompt_template && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/50">
                User Prompt Template
              </div>
              <TemplateText text={prompt.user_prompt_template} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContentPromptsPanel({ prompts }: { prompts: AOContentPrompt[] }) {
  const byCategory = prompts.reduce<Record<string, AOContentPrompt[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
  const categories = Object.keys(byCategory);

  return (
    <AiDataPanel
      title="Content Prompt Templates"
      count={prompts.length}
      status={prompts.length === 0 ? "empty" : "ok"}
    >
      {prompts.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">
          No content prompts found in AnamayOS. Add them at{" "}
          <a
            href="https://ao.anamaya.com/dashboard/settings#ai-data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-anamaya-green hover:text-anamaya-green-dark"
          >
            ao.anamaya.com → Settings → AI Data
          </a>
          .
        </p>
      ) : (
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/50">
                {CATEGORY_LABELS[cat] ?? cat}
              </h4>
              <div className="space-y-3">
                {byCategory[cat].map((p) => (
                  <PromptCard key={p.id} prompt={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AiDataPanel>
  );
}
