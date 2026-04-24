"use client";

import { useState } from "react";

/** Collapsible panel used for every section on the AI admin page. */
export default function AiDataPanel({
  title,
  count,
  status = "ok",
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Row/item count shown in the header badge. */
  count?: number;
  /** "ok" = green dot, "warn" = amber, "empty" = grey, "error" = red */
  status?: "ok" | "warn" | "empty" | "error";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const dot =
    status === "ok"
      ? "bg-anamaya-green"
      : status === "warn"
      ? "bg-amber-400"
      : status === "error"
      ? "bg-red-500"
      : "bg-zinc-300";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} />
          <span className="text-base font-semibold text-anamaya-charcoal">
            {title}
          </span>
          {count !== undefined && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-anamaya-charcoal/60">
              {count}
            </span>
          )}
        </div>
        <span className="text-lg text-anamaya-charcoal/40">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4">{children}</div>
      )}
    </section>
  );
}
