"use client";

import { useMemo, useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOBrandGuide, AOArchetype, AOContentPrompt, AOProvider } from "@/types/ao-ai";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green bg-white";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

/** Highlights {{variable}} tokens in amber inside a <pre>. */
function HighlightedPre({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <pre className={className}>
      {parts.map((part, i) =>
        part.startsWith("{{") ? (
          <span key={i} className="rounded bg-amber-200 px-0.5 text-amber-800 font-semibold">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </pre>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function AiSandbox({
  guides,
  archetypes,
  prompts,
  providers,
}: {
  guides: AOBrandGuide[];
  archetypes: AOArchetype[];
  prompts: AOContentPrompt[];
  providers: AOProvider[];
}) {
  const sortedProviders = useMemo(
    () =>
      [...providers].sort((a, b) =>
        (a.display_name ?? a.id).localeCompare(b.display_name ?? b.id, undefined, { sensitivity: "base" }),
      ),
    [providers],
  );

  const [guideId, setGuideId] = useState(guides[0]?.id ?? "");
  const [archetypeId, setArchetypeId] = useState("");
  const [promptId, setPromptId] = useState("");
  const [providerId, setProviderId] = useState(sortedProviders[0]?.id ?? "");
  const activeModelsForProvider = useMemo(() => {
    const provider = sortedProviders.find((p) => p.id === providerId);
    if (!provider) return [];
    const models = Array.isArray(provider.models) ? provider.models : [];
    return models.filter((m) => m.active);
  }, [sortedProviders, providerId]);
  const [modelId, setModelId] = useState(activeModelsForProvider[0]?.id ?? "");
  const [userText, setUserText] = useState("");
  const [assembled, setAssembled] = useState<{ system: string; user: string } | null>(null);
  const [stale, setStale] = useState(false);

  function markStale() {
    if (assembled) setStale(true);
  }

  function handleProviderChange(next: string) {
    setProviderId(next);
    const provider = sortedProviders.find((p) => p.id === next);
    const models = Array.isArray(provider?.models) ? provider!.models : [];
    const firstActive = models.find((m) => m.active);
    setModelId(firstActive?.id ?? "");
    markStale();
  }

  const guide = guides.find((g) => g.id === guideId) ?? null;
  const archetype = archetypes.find((a) => a.id === archetypeId) ?? null;
  const promptTemplate = prompts.find((p) => p.id === promptId) ?? null;
  const selectedProvider = sortedProviders.find((p) => p.id === providerId) ?? null;
  const selectedModel = activeModelsForProvider.find((m) => m.id === modelId) ?? null;

  function assemble() {
    const sysParts: string[] = [];

    if (guide?.compiled_context) {
      sysParts.push(guide.compiled_context);
    } else if (guide) {
      // Fall back to assembling from raw fields when no compiled_context yet
      const parts: string[] = [];
      if (guide.voice_tone) parts.push(`Voice & Tone: ${guide.voice_tone}`);
      if (guide.messaging_points?.length) parts.push(`Key Messages: ${guide.messaging_points.join(", ")}`);
      if (guide.usps?.length) parts.push(`USPs: ${guide.usps.join(", ")}`);
      if (guide.personality_traits?.length) parts.push(`Personality: ${guide.personality_traits.join(", ")}`);
      if (guide.dos_and_donts?.dos?.length) parts.push(`Do: ${guide.dos_and_donts.dos.join("; ")}`);
      if (guide.dos_and_donts?.donts?.length) parts.push(`Don't: ${guide.dos_and_donts.donts.join("; ")}`);
      if (parts.length) sysParts.push(parts.join("\n"));
    }

    if (promptTemplate?.system_prompt) sysParts.push(promptTemplate.system_prompt);

    if (archetype) {
      const parts: string[] = [`Target audience: ${archetype.name}`];
      if (archetype.description) parts.push(`Description: ${archetype.description}`);
      if (archetype.content_tone) parts.push(`Tone: ${archetype.content_tone}`);
      if (archetype.motivations?.length) parts.push(`Motivations: ${archetype.motivations.join(", ")}`);
      if (archetype.pain_points?.length) parts.push(`Pain points: ${archetype.pain_points.join(", ")}`);
      sysParts.push(parts.join("\n"));
    }

    let user = userText;
    if (promptTemplate?.user_prompt_template) {
      user = promptTemplate.user_prompt_template.replace(
        /\{\{(\w+)\}\}/g,
        (_, key) => (key === "content" || key === "text" ? userText : `{{${key}}}`),
      );
    }

    setAssembled({ system: sysParts.join("\n\n"), user });
    setStale(false);
  }

  return (
    <AiDataPanel title="Sandbox — Assemble & Preview Prompts" status="ok">
      <div className="space-y-5">
        <p className="text-sm text-anamaya-charcoal/70">
          Choose a brand guide and optionally an archetype and prompt template, then paste some
          page content. Click <strong>Assemble</strong> to see the exact system + user prompt
          that would go to an AI model.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>AI Provider</label>
            <select
              className={inputCls}
              value={providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={sortedProviders.length === 0}
            >
              {sortedProviders.length === 0 && <option value="">(No providers configured)</option>}
              {sortedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.id}
                  {!p.is_connected ? " (not connected)" : ""}
                </option>
              ))}
            </select>
            {selectedProvider && !selectedProvider.is_connected && (
              <p className="mt-1 text-[11px] text-amber-600">
                Provider not connected in AnamayOS — this selection is informational.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <select
              className={inputCls}
              value={modelId}
              onChange={(e) => { setModelId(e.target.value); markStale(); }}
              disabled={activeModelsForProvider.length === 0}
            >
              {activeModelsForProvider.length === 0 && (
                <option value="">(No active models)</option>
              )}
              {activeModelsForProvider.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.id}
                </option>
              ))}
            </select>
            {selectedModel?.endpoint && (
              <p className="mt-1 text-[11px] font-mono text-anamaya-charcoal/40 truncate" title={selectedModel.endpoint}>
                {selectedModel.endpoint}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Brand Guide</label>
            <select
              className={inputCls}
              value={guideId}
              onChange={(e) => { setGuideId(e.target.value); markStale(); }}
            >
              <option value="">(None)</option>
              {guides.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}{!g.compiled_context ? " ⚠" : ""}
                </option>
              ))}
            </select>
            {guide && !guide.compiled_context && (
              <p className="mt-1 text-[11px] text-amber-600">
                No compiled context — using raw fields as fallback.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Target Archetype (optional)</label>
            <select
              className={inputCls}
              value={archetypeId}
              onChange={(e) => { setArchetypeId(e.target.value); markStale(); }}
            >
              <option value="">(Any audience)</option>
              {archetypes.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Prompt Template (optional)</label>
            <select
              className={inputCls}
              value={promptId}
              onChange={(e) => { setPromptId(e.target.value); markStale(); }}
            >
              <option value="">(Free-form)</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Your content / page text</label>
          <textarea
            className={inputCls}
            rows={6}
            value={userText}
            onChange={(e) => { setUserText(e.target.value); markStale(); }}
            placeholder="Paste a block's HTML, a page excerpt, or any text you want the AI to work with…"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={assemble}
            className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Assemble Prompt
          </button>
          {stale && (
            <span className="text-xs text-amber-600">
              Inputs changed — click Assemble to refresh.
            </span>
          )}
        </div>

        {assembled && (
          <div className={`space-y-4 transition-opacity ${stale ? "opacity-50" : ""}`}>
            {!assembled.system && (
              <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                No system prompt assembled — select a brand guide or prompt template above.
              </div>
            )}
            {assembled.system && (
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={labelCls}>System Prompt</span>
                  <span className="text-[10px] text-anamaya-charcoal/40">
                    {assembled.system.length} chars
                  </span>
                  <div className="ml-auto">
                    <CopyButton text={assembled.system} />
                  </div>
                </div>
                <HighlightedPre
                  text={assembled.system}
                  className="max-h-72 overflow-y-auto rounded-md bg-zinc-950 p-4 text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap break-words font-mono"
                />
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={labelCls}>User Prompt</span>
                <span className="text-[10px] text-anamaya-charcoal/40">
                  {assembled.user.length} chars
                </span>
                <div className="ml-auto">
                  <CopyButton text={assembled.user} />
                </div>
              </div>
              <HighlightedPre
                text={assembled.user || "(Paste your content above)"}
                className="max-h-72 overflow-y-auto rounded-md bg-zinc-50 p-4 text-xs leading-relaxed text-anamaya-charcoal/80 whitespace-pre-wrap break-words font-mono ring-1 ring-zinc-200"
              />
            </div>
            {assembled.system && (
              <p className="text-[11px] text-anamaya-charcoal/50">
                Unfilled{" "}
                <span className="rounded bg-amber-100 px-0.5 font-mono text-amber-700">
                  {"{{variables}}"}
                </span>{" "}
                are left as-is — they'll be substituted when a live AI call is wired up.
              </p>
            )}
          </div>
        )}
      </div>
    </AiDataPanel>
  );
}
