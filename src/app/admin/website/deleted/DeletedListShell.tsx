"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POST_TYPES } from "@/lib/website-builder/post-types";
import type { TrashedRow } from "@/lib/website-builder/queries";
import { useRowSelection } from "../_components/useRowSelection";
import RoundCheckbox from "../_components/RoundCheckbox";
import { bulkRestoreItems, bulkPurgeItems } from "./actions";

/** Resolve a post_type value to its admin label + list slug (for the edit
 *  link). Falls back to the raw value if the type isn't in the registry. */
function typeInfo(postType: string): { label: string; slug: string | null } {
  const pt = POST_TYPES.find((p) => p.postType === postType);
  return { label: pt?.label ?? postType, slug: pt?.slug ?? null };
}

function formatDeletedDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

export default function DeletedListShell({ rows }: { rows: TrashedRow[] }) {
  const router = useRouter();
  const selection = useRowSelection();
  const [bulkAction, setBulkAction] = useState<"" | "restore" | "purge">("");

  const visibleIds = rows.map((r) => r.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.isSelected(id));
  const canApply = bulkAction !== "" && selection.count > 0;

  async function runRestore(ids: string[]) {
    if (!ids.length) return;
    await bulkRestoreItems(ids);
    selection.clear();
    setBulkAction("");
    router.refresh();
  }

  async function runPurge(ids: string[]) {
    if (!ids.length) return;
    if (
      !confirm(
        `Permanently delete ${ids.length} ${
          ids.length === 1 ? "item" : "items"
        }? This cannot be undone.`,
      )
    )
      return;
    await bulkPurgeItems(ids);
    selection.clear();
    setBulkAction("");
    router.refresh();
  }

  async function handleApply() {
    const ids = Array.from(selection.selected);
    if (!ids.length) return;
    if (bulkAction === "restore") await runRestore(ids);
    else if (bulkAction === "purge") await runPurge(ids);
  }

  return (
    <div>
      {/* Bulk actions toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <select
          aria-label="Bulk actions"
          className="h-7 rounded-full border border-[#8c8f94] bg-white px-3 text-[13px] disabled:opacity-50"
          value={bulkAction}
          onChange={(e) => {
            const v = e.target.value;
            setBulkAction(v === "restore" || v === "purge" ? v : "");
          }}
        >
          <option value="">Bulk actions</option>
          <option value="restore">Restore</option>
          <option value="purge">Delete Permanently</option>
        </select>
        <button
          type="button"
          aria-label="Apply bulk action"
          disabled={!canApply}
          onClick={handleApply}
          className="h-7 rounded-full border border-[#8c8f94] bg-white px-4 text-[13px] disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#c3c4c7] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="w-8 px-3 py-2">
                <RoundCheckbox
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(e) => selection.setMany(visibleIds, e.target.checked)}
                />
              </th>
              <th className="w-[50%] px-3 py-2 font-semibold text-[#2271b1]">
                Title
              </th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Type</th>
              <th className="w-48 px-3 py-2 text-right font-semibold text-[#2271b1]">
                Deleted
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-12 text-center text-[13px] text-[#50575e]"
                >
                  Nothing in the trash.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const info = typeInfo(row.post_type);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                  >
                    <td className="px-3 py-2">
                      <RoundCheckbox
                        aria-label={`Select ${row.title}`}
                        checked={selection.isSelected(row.id)}
                        onChange={() => selection.toggle(row.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {info.slug ? (
                        <Link
                          href={`/admin/website/${info.slug}/${row.id}`}
                          className="font-semibold text-[#2271b1] hover:text-[#135e96] hover:underline"
                        >
                          {row.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[#1d2327]">
                          {row.title}
                        </span>
                      )}
                      <span className="ml-1 text-[#1d2327]">— Trash</span>
                      <div className="mt-1 flex gap-2 text-[13px] text-[#50575e]">
                        <button
                          type="button"
                          onClick={() => runRestore([row.id])}
                          className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                        >
                          Restore
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => runPurge([row.id])}
                          className="text-[#b32d2e] hover:text-[#8a1f1f] hover:underline"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[#50575e]">{info.label}</td>
                    <td className="px-3 py-2 text-right align-top">
                      <div className="text-[14px] leading-snug text-[#50575e]">
                        {formatDeletedDate(row.date_modified ?? row.date_published)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom count */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#50575e]">
        <span>
          {rows.length} {rows.length === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  );
}
