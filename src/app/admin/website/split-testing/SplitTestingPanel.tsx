"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SplitGroupFull } from "@/lib/website-builder/split-testing";
import {
  createEmptyGroup,
  setGroupStatus,
  deleteGroup,
  renameGroup,
} from "./actions";

// A version needs at least this many impressions before we call a winner, so
// early noise doesn't paint a false leader.
const MIN_SAMPLE = 30;

type Verdict = "win" | "close" | "lose" | "neutral";

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtTime(ms: number | null): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

const ROW_TINT: Record<Verdict, string> = {
  win: "bg-[#eaf6ec]",
  close: "bg-[#fdf6e7]",
  lose: "bg-[#fbeaea]",
  neutral: "",
};
const BADGE: Record<Verdict, { cls: string; label: string } | null> = {
  win: { cls: "bg-[#1e7e34] text-white", label: "Winning" },
  close: { cls: "bg-[#dba617] text-white", label: "Close" },
  lose: { cls: "bg-[#b32d2e] text-white", label: "Behind" },
  neutral: null,
};

export default function SplitTestingPanel({
  groups,
}: {
  groups: SplitGroupFull[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onNew() {
    const name = prompt("Name the new test group:", "");
    if (name === null) return;
    await run(() => createEmptyGroup(name));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px]">
        <span className="text-[#50575e]">
          Start a test from any page&apos;s <strong>Split Testing</strong> box
          (Make Test Variant), by selecting pages in a list and choosing{" "}
          <strong>Make Test Group</strong>, or create an empty group here and
          add pages to it.
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={onNew}
          className="rounded-full bg-[#2271b1] px-4 py-1 font-semibold text-white hover:bg-[#135e96] disabled:opacity-50"
        >
          New Test Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[#c3c4c7] bg-white px-3 py-12 text-center text-[13px] text-[#50575e]">
          No split tests yet.
        </div>
      ) : (
        groups.map(({ group, members }) => {
          // Winner coloring by click-through rate, once there's enough data.
          const withCtr = members.map((m) => {
            const impressions = m.stat?.impressions ?? 0;
            const clicks = m.stat?.cta_clicks ?? 0;
            return {
              m,
              impressions,
              visitors: m.stat?.visitors ?? 0,
              clicks,
              ctr: impressions > 0 ? clicks / impressions : 0,
              dwell: m.stat?.avg_dwell_ms ?? null,
            };
          });
          const eligible = withCtr.filter((x) => x.impressions >= MIN_SAMPLE);
          const bestCtr =
            eligible.length >= 2
              ? Math.max(...eligible.map((x) => x.ctr))
              : null;

          function verdict(x: (typeof withCtr)[number]): Verdict {
            if (bestCtr == null || x.impressions < MIN_SAMPLE) return "neutral";
            if (x.ctr === bestCtr) return "win";
            const ratio = bestCtr > 0 ? x.ctr / bestCtr : 1;
            return ratio >= 0.9 ? "close" : "lose";
          }

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-[#c3c4c7] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#1d2327]">
                    {group.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      group.status === "running"
                        ? "bg-[#eaf6ec] text-[#1e7e34]"
                        : "bg-[#f0f0f1] text-[#50575e]"
                    }`}
                  >
                    {group.status}
                  </span>
                  {bestCtr == null && (
                    <span className="text-[12px] text-[#50575e]">
                      collecting data
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        setGroupStatus(
                          group.id,
                          group.status === "running" ? "paused" : "running",
                        ),
                      )
                    }
                    className="rounded-full border border-[#8c8f94] px-3 py-1 font-semibold text-[#2271b1] hover:bg-[#f6fbfd] disabled:opacity-50"
                  >
                    {group.status === "running" ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const name = prompt("Rename test group:", group.name);
                      if (name === null) return;
                      await run(() => renameGroup(group.id, name));
                    }}
                    className="rounded-full border border-[#8c8f94] px-3 py-1 font-semibold text-[#2271b1] hover:bg-[#f6fbfd] disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          "Delete this test group? The pages are kept; only the grouping is removed.",
                        )
                      )
                        return;
                      run(() => deleteGroup(group.id));
                    }}
                    className="rounded-full px-3 py-1 font-semibold text-[#b32d2e] hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#c3c4c7] text-left text-[#50575e]">
                      <th className="px-3 py-2 font-semibold">Version</th>
                      <th className="px-3 py-2 font-semibold">Page</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Impressions
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Visitors
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        CTA clicks
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">CTR</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Avg time
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {withCtr.map((x) => {
                      const v = verdict(x);
                      const badge = BADGE[v];
                      return (
                        <tr
                          key={x.m.id}
                          className={`border-t border-[#f0f0f1] ${ROW_TINT[v]}`}
                        >
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-[#e7eef7] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2271b1]">
                              {x.m.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {x.m.slug ? (
                              <Link
                                href={`/admin/website/${x.m.slug}/${x.m.id}`}
                                className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                              >
                                {x.m.title}
                              </Link>
                            ) : (
                              <span className="text-[#1d2327]">{x.m.title}</span>
                            )}
                            {!x.m.hasTemplate && (
                              <span
                                title="No template assigned — split serving needs a template."
                                className="ml-2 rounded-sm bg-[#fbf0dc] px-1.5 py-0.5 text-[11px] font-semibold text-[#8a6d00]"
                              >
                                No template
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {x.impressions}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {x.visitors}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {x.clicks}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#1d2327]">
                            {x.impressions > 0 ? fmtPct(x.ctr) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmtTime(x.dwell)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {badge && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
