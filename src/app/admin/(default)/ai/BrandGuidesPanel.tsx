"use client";

import { useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOBrandGuide } from "@/types/ao-ai";

function Chips({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return <span className="italic text-anamaya-charcoal/40 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-anamaya-charcoal/80">
          {item}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/50">
        {label}
      </div>
      {children}
    </div>
  );
}

function GuideCard({ guide }: { guide: AOBrandGuide }) {
  const [expanded, setExpanded] = useState(false);
  const updated = guide.updated_at ? new Date(guide.updated_at).toLocaleDateString() : "—";
  const hasContent =
    guide.voice_tone ||
    guide.messaging_points?.length ||
    guide.usps?.length ||
    guide.personality_traits?.length ||
    guide.compiled_context;

  return (
    <div className="rounded-md border border-zinc-200">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anamaya-charcoal">{guide.name}</h3>
            {!guide.compiled_context && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 ring-1 ring-amber-200">
                No compiled context
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-anamaya-charcoal/50">Updated {updated}</p>
        </div>
        {hasContent && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 text-xs font-semibold text-anamaya-green hover:text-anamaya-green-dark"
          >
            {expanded ? "Close ▲" : "Open ▼"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-4">
          {guide.voice_tone && (
            <Field label="Voice & Tone">
              <p className="text-sm text-anamaya-charcoal/80 leading-relaxed">{guide.voice_tone}</p>
            </Field>
          )}
          {(guide.messaging_points?.length || guide.usps?.length || guide.personality_traits?.length) ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Messaging Points">
                <Chips items={guide.messaging_points} />
              </Field>
              <Field label="USPs">
                <Chips items={guide.usps} />
              </Field>
              <Field label="Personality Traits">
                <Chips items={guide.personality_traits} />
              </Field>
            </div>
          ) : null}
          {guide.dos_and_donts && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Do's">
                <ul className="space-y-1">
                  {guide.dos_and_donts.dos?.map((d, i) => (
                    <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
                      <span className="text-anamaya-green font-bold">✓</span> {d}
                    </li>
                  ))}
                </ul>
              </Field>
              <Field label="Don'ts">
                <ul className="space-y-1">
                  {guide.dos_and_donts.donts?.map((d, i) => (
                    <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
                      <span className="text-red-400 font-bold">✗</span> {d}
                    </li>
                  ))}
                </ul>
              </Field>
            </div>
          )}
          <Field label="Compiled Context (LLM System Prompt)">
            {guide.compiled_context ? (
              <pre className="max-h-64 overflow-y-auto rounded-md bg-zinc-950 p-3 text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap break-words font-mono">
                {guide.compiled_context}
              </pre>
            ) : (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                No compiled context yet — generate it in AnamayOS under{" "}
                <a
                  href="https://ao.anamaya.com/dashboard/settings#ai-data"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Settings → AI Data → Brand Guides
                </a>
                .
              </p>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

export default function BrandGuidesPanel({ guides }: { guides: AOBrandGuide[] }) {
  const status = guides.length === 0 ? "empty" : guides.some((g) => g.compiled_context) ? "ok" : "warn";
  return (
    <AiDataPanel title="Brand Guides" count={guides.length} status={status} defaultOpen={guides.length > 0}>
      {guides.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">
          No brand guides found in AnamayOS. Create one at{" "}
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
        <div className="space-y-3">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      )}
    </AiDataPanel>
  );
}
