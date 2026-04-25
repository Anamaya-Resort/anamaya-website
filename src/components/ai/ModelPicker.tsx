"use client";

import { useEffect, useState } from "react";
import type { AvailableModels, ModelKind, ModelOption } from "@/lib/ai/providers";

type Props = {
  kind: ModelKind;
  value: string | null;
  onChange: (ref: string) => void;
};

type State =
  | { status: "loading" }
  | { status: "error"; reason: string }
  | { status: "ready"; data: AvailableModels };

const ROLE_LABEL: Record<ModelOption["role"], string> = {
  best: "best",
  fastest: "fastest",
  standard: "",
};

/**
 * Active models grouped by provider on top, inactive (greyed) below a
 * divider. Inactive options carry the reason in `title=` for tooltip
 * disclosure but stay disabled in the dropdown.
 */
export default function ModelPicker({ kind, value, onChange }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/ai/models?kind=${kind}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `HTTP ${res.status}`);
        }
        return (await res.json()) as AvailableModels;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", data });
        if (!value && data.defaultRef) onChange(data.defaultRef);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const reason = err instanceof Error ? err.message : "Failed to load models";
        setState({ status: "error", reason });
      });
    return () => {
      cancelled = true;
    };
    // value/onChange intentionally omitted: re-fetching on parent state
    // change would thrash the dropdown. We fetch once per kind.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  if (state.status === "loading") {
    return (
      <div className="text-[12px] text-[#50575e]">Loading models…</div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="text-[12px] text-[#b32d2e]">
        Couldn't load models: {state.reason}
      </div>
    );
  }

  const { active, inactive } = state.data;
  if (active.length === 0 && inactive.length === 0) {
    return (
      <div className="text-[12px] text-[#50575e]">
        No models configured. Add a provider key in AnamayOS first.
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Model"
      className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
    >
      {active.length > 0 && (
        <optgroup label="Active">
          {active.map((m) => (
            <option key={m.ref} value={m.ref}>
              {labelFor(m)}
            </option>
          ))}
        </optgroup>
      )}
      {inactive.length > 0 && (
        <optgroup label="── Inactive ──">
          {inactive.map((m) => (
            <option
              key={m.ref}
              value={m.ref}
              disabled
              title={m.inactiveReason ?? undefined}
            >
              {labelFor(m)} — {m.inactiveReason ?? "unavailable"}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

function labelFor(m: ModelOption): string {
  const role = ROLE_LABEL[m.role];
  const suffix = role ? ` (${role})` : "";
  return `${m.providerName} · ${m.label}${suffix}`;
}
