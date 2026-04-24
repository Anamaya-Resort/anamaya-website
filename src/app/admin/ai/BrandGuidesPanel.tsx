"use client";

import { useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOBrandGuide } from "@/types/ao-ai";

function JsonChips({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return <span className="text-anamaya-charcoal/40 italic">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-anamaya-charcoal/80"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/50">
        {label}
      </div>
      {children}
    </div>
  );
}

function GuideCard({ guide }: { guide: AOBrandGuide }) {
  const [expanded, setExpanded] = useState(false);
  const updated = guide.updated_at
    ? new Date(guide.updated_at).toLocaleDateString()
    : "—";

  return (
    <div className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-anamaya-charcoal">{guide.name}</h3>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/50">Updated {updated}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {guide.voice_tone && (
            <Field label="Voice & Tone">
              <p className="text-sm text-anamaya-charcoal/80">{guide.voice_tone}</p>
            </Field>
          )}
          <Field label="Messaging Points">
            <JsonChips items={guide.messaging_points} />
          </Field>
          <Field label="USPs">
            <JsonChips items={guide.usps} />
          </Field>
          <Field label="Personality Traits">
            <JsonChips items={guide.personality_traits} />
          </Field>
          {guide.dos_and_donts && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Do's">
                <ul className="space-y-1">
                  {guide.dos_and_donts.dos?.map((d, i) => (
                    <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
                      <span className="text-anamaya-green">✓</span> {d}
                    </li>
                  ))}
                </ul>
              </Field>
              <Field label="Don'ts">
                <ul className="space-y-1">
                  {guide.dos_and_donts.donts?.map((d, i) => (
                    <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
                      <span className="text-red-400">✗</span> {d}
                    </li>
                  ))}
                </ul>
              </Field>
            </div>
          )}
          <Field label="Compiled Context (LLM System Prompt)">
            {guide.compiled_context ? (
              <pre className="max-h-64 overflow-y-auto rounded-md bg-zinc-950 p-3 text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap">
                {guide.compiled_context}
              </pre>
            ) : (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
                No compiled context yet — generate it in AnamayOS under Settings → AI Data → Brand Guides.
              </p>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

export default function BrandGuidesPanel({ guides }: { guides: AOBrandGuide[] }) {
  const status = guides.length === 0 ? "empty" : guides.some(g => g.compiled_context) ? "ok" : "warn";
  return (
    <AiDataPanel
      title="Brand Guides"
      count={guides.length}
      status={status}
      defaultOpen={guides.length > 0}
    >
      {guides.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">
          No brand guides found in AnamayOS. Create one at{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">ao.anamaya.com/dashboard/settings#ai-data</code>.
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
