"use client";

import AiDataPanel from "./AiDataPanel";
import type { AOProvider } from "@/types/ao-ai";

const PROVIDER_ICONS: Record<string, string> = {
  openai: "🟢",
  anthropic: "🟠",
  google: "🔵",
  xai: "⚫",
};

export default function ProvidersPanel({ providers }: { providers: AOProvider[] }) {
  const connected = providers.filter((p) => p.is_connected);
  const status =
    providers.length === 0 ? "empty" : connected.length > 0 ? "ok" : "warn";

  return (
    <AiDataPanel
      title="AI Providers (AnamayOS)"
      count={providers.length}
      status={status}
    >
      {providers.length === 0 ? (
        <p className="text-sm italic text-anamaya-charcoal/50">No providers returned.</p>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-md border border-zinc-200 p-4">
              <div className="flex items-center gap-3">
                <span className="text-base">{PROVIDER_ICONS[p.id] ?? "⚪"}</span>
                <div className="flex-1">
                  <span className="font-semibold text-anamaya-charcoal">
                    {p.display_name ?? p.id}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
              {p.models?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.models
                    .filter((m) => m.active)
                    .map((m) => (
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
          ))}
          <p className="text-[11px] text-anamaya-charcoal/40">
            Connection status reflects AnamayOS keys. The website uses its own API keys for actual calls.
          </p>
        </div>
      )}
    </AiDataPanel>
  );
}
