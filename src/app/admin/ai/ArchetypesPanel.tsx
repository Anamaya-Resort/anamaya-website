"use client";

import { useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOArchetype } from "@/types/ao-ai";

function Chips({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return <span className="text-anamaya-charcoal/40 italic text-xs">—</span>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
          <span className="text-anamaya-charcoal/30">•</span> {item}
        </li>
      ))}
    </ul>
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

function ArchetypeCard({ archetype }: { archetype: AOArchetype }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-md border p-4 ${archetype.is_active ? "border-zinc-200" : "border-dashed border-zinc-200 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anamaya-charcoal">{archetype.name}</h3>
            {!archetype.is_active && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-anamaya-charcoal/50">
                Inactive
              </span>
            )}
          </div>
          {archetype.description && (
            <p className="mt-1 text-xs text-anamaya-charcoal/60 line-clamp-2">{archetype.description}</p>
          )}
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {archetype.content_tone && (
            <Field label="Content Tone">
              <p className="text-xs italic text-anamaya-charcoal/80">{archetype.content_tone}</p>
            </Field>
          )}
          {archetype.demographics && Object.keys(archetype.demographics).length > 0 && (
            <Field label="Demographics">
              <div className="space-y-0.5">
                {Object.entries(archetype.demographics).map(([k, v]) => (
                  <p key={k} className="text-xs text-anamaya-charcoal/80">
                    <span className="font-medium capitalize">{k}:</span> {v}
                  </p>
                ))}
              </div>
            </Field>
          )}
          <Field label="Motivations">
            <Chips items={archetype.motivations} />
          </Field>
          <Field label="Pain Points">
            <Chips items={archetype.pain_points} />
          </Field>
          {archetype.sample_messaging?.length ? (
            <div className="sm:col-span-2">
              <Field label="Sample Messaging">
                <div className="space-y-1">
                  {archetype.sample_messaging.map((msg, i) => (
                    <p key={i} className="rounded bg-zinc-50 px-2 py-1 text-xs italic text-anamaya-charcoal/80">
                      "{msg}"
                    </p>
                  ))}
                </div>
              </Field>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ArchetypesPanel({ archetypes }: { archetypes: AOArchetype[] }) {
  const active = archetypes.filter((a) => a.is_active);
  const status = archetypes.length === 0 ? "empty" : active.length > 0 ? "ok" : "warn";
  return (
    <AiDataPanel title="Customer Archetypes" count={archetypes.length} status={status}>
      {archetypes.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">
          No archetypes found in AnamayOS. Add them at{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">ao.anamaya.com/dashboard/settings#ai-data</code>.
        </p>
      ) : (
        <div className="space-y-3">
          {archetypes.map((a) => (
            <ArchetypeCard key={a.id} archetype={a} />
          ))}
        </div>
      )}
    </AiDataPanel>
  );
}
