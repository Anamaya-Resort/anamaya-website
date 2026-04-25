"use client";

import { useState } from "react";
import AiDataPanel from "./AiDataPanel";
import type { AOArchetype } from "@/types/ao-ai";

function BulletList({ items }: { items: string[] | null | undefined }) {
  if (!items?.length) return <span className="italic text-anamaya-charcoal/40 text-xs">—</span>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-anamaya-charcoal/80">
          <span className="text-anamaya-charcoal/30 select-none">•</span>
          {item}
        </li>
      ))}
    </ul>
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

function ArchetypeCard({ archetype }: { archetype: AOArchetype }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-md border ${archetype.is_active ? "border-zinc-200" : "border-dashed border-zinc-200 opacity-60"}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anamaya-charcoal">{archetype.name}</h3>
            {!archetype.is_active && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-anamaya-charcoal/50">
                Inactive
              </span>
            )}
          </div>
          {archetype.description && (
            <p className="mt-0.5 text-[11px] text-anamaya-charcoal/60 line-clamp-1">{archetype.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 text-xs font-semibold text-anamaya-green hover:text-anamaya-green-dark"
        >
          {expanded ? "Close ▲" : "Open ▼"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-4">
          {archetype.description && (
            <Field label="Description">
              <p className="text-xs leading-relaxed text-anamaya-charcoal/80">{archetype.description}</p>
            </Field>
          )}
          {archetype.content_tone && (
            <Field label="Content Tone">
              <p className="text-xs italic text-anamaya-charcoal/80">{archetype.content_tone}</p>
            </Field>
          )}
          {archetype.demographics && Object.keys(archetype.demographics).length > 0 && (
            <Field label="Demographics">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {Object.entries(archetype.demographics).map(([k, v]) => (
                  <p key={k} className="text-xs text-anamaya-charcoal/80">
                    <span className="font-medium capitalize">{k.replace(/_/g, " ")}:</span> {v}
                  </p>
                ))}
              </div>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Motivations">
              <BulletList items={archetype.motivations} />
            </Field>
            <Field label="Pain Points">
              <BulletList items={archetype.pain_points} />
            </Field>
          </div>
          {archetype.sample_messaging?.length ? (
            <Field label="Sample Messaging">
              <div className="space-y-1.5">
                {archetype.sample_messaging.map((msg, i) => (
                  <p key={i} className="rounded bg-zinc-50 px-3 py-1.5 text-xs italic text-anamaya-charcoal/80 ring-1 ring-zinc-200">
                    "{msg}"
                  </p>
                ))}
              </div>
            </Field>
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
          {archetypes.map((a) => (
            <ArchetypeCard key={a.id} archetype={a} />
          ))}
        </div>
      )}
    </AiDataPanel>
  );
}
