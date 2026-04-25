"use client";

import AiDataPanel from "./AiDataPanel";
import type { AOProvider } from "@/types/ao-ai";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-800",
  anthropic: "bg-orange-100 text-orange-800",
  google: "bg-blue-100 text-blue-800",
  xai: "bg-zinc-200 text-zinc-700",
};

export default function ProvidersPanel({ providers }: { providers: AOProvider[] }) {
  const connected = providers.filter((p) => p.is_connected);
  const status = providers.length === 0 ? "empty" : connected.length > 0 ? "ok" : "warn";
  const sorted = [...providers].sort((a, b) =>
    (a.display_name ?? a.id).localeCompare(b.display_name ?? b.id, undefined, { sensitivity: "base" }),
  );

  return (
    <AiDataPanel title="AI Providers (AnamayOS)" count={providers.length} status={status}>
      {providers.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">No providers returned.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const models = Array.isArray(p.models) ? p.models : [];
            const activeModels = models.filter((m) => m.active);
            return (
              <div key={p.id} className="rounded-md border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${PROVIDER_COLORS[p.id] ?? "bg-zinc-100 text-zinc-600"}`}
                  >
                    {p.id}
                  </span>
                  <span className="font-semibold text-anamaya-charcoal">
                    {p.display_name ?? p.id}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.is_connected
                        ? "bg-anamaya-green/10 text-anamaya-green"
                        : "bg-zinc-100 text-anamaya-charcoal/50"
                    }`}
                  >
                    {p.is_connected ? "Connected" : "Not connected"}
                  </span>
                  {p.last_tested_at && (
                    <span className="text-[10px] text-anamaya-charcoal/40">
                      Tested {new Date(p.last_tested_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {activeModels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {activeModels.map((m) => (
                      <span
                        key={m.id}
                        title={`endpoint: ${m.endpoint}`}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-mono text-anamaya-charcoal/70"
                      >
                        {m.name ?? m.id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-anamaya-charcoal/40">
            Connection status reflects AnamayOS API keys. The website uses its own keys for live calls.
          </p>
        </div>
      )}
    </AiDataPanel>
  );
}
