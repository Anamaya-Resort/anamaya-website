"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaxonomyManagerTerm } from "./data";
import {
  renameTerm,
  setTermType,
  deleteTerm,
  createTerm,
  mergeTerm,
} from "./actions";

type SortKey = "count" | "name";
type TypeFilter = "all" | "category" | "post_tag";

const TYPE_LABEL: Record<"category" | "post_tag", string> = {
  category: "Category",
  post_tag: "Tag",
};

export default function TaxonomyManager({
  terms,
}: {
  terms: TaxonomyManagerTerm[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // List controls.
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("count");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Add-new form.
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"category" | "post_tag">("category");

  // Inline rename state (which row is being edited + its draft values).
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  // Inline merge state (which row is choosing a merge target).
  const [mergeId, setMergeId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = terms;
    if (typeFilter !== "all") {
      list = list.filter((t) => t.taxonomy === typeFilter);
    }
    if (q) {
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) =>
        b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name),
      );
    }
    return sorted;
  }, [terms, search, sort, typeFilter]);

  /** Run a server action, surface its error, refresh on success. */
  function run(action: () => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  function startEdit(t: TaxonomyManagerTerm): void {
    setMergeId(null);
    setEditId(t.id);
    setEditName(t.name);
    setEditSlug(t.slug ?? "");
  }

  function cancelEdit(): void {
    setEditId(null);
    setEditName("");
    setEditSlug("");
  }

  function saveEdit(id: string): void {
    run(async () => {
      const res = await renameTerm(id, editName, editSlug);
      if (res.ok) cancelEdit();
      return res;
    });
  }

  function startMerge(t: TaxonomyManagerTerm): void {
    setEditId(null);
    setMergeId(t.id);
    setMergeTarget("");
  }

  function cancelMerge(): void {
    setMergeId(null);
    setMergeTarget("");
  }

  function confirmMerge(source: TaxonomyManagerTerm): void {
    if (!mergeTarget) return;
    const target = terms.find((t) => t.id === mergeTarget);
    if (!target) return;
    const ok = window.confirm(
      `Merge "${source.name}" into "${target.name}"? All articles keep the ` +
        `target term; "${source.name}" is deleted.`,
    );
    if (!ok) return;
    run(async () => {
      const res = await mergeTerm(source.id, target.id);
      if (res.ok) cancelMerge();
      return res;
    });
  }

  function handleDelete(t: TaxonomyManagerTerm): void {
    const ok = window.confirm(
      `Delete "${t.name}"? Its article links will be removed.`,
    );
    if (!ok) return;
    run(() => deleteTerm(t.id));
  }

  function handleToggleType(t: TaxonomyManagerTerm): void {
    const next = t.taxonomy === "category" ? "post_tag" : "category";
    run(() => setTermType(t.id, next));
  }

  function handleAdd(): void {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    run(async () => {
      const res = await createTerm(newName, newType);
      if (res.ok) setNewName("");
      return res;
    });
  }

  const inputCls =
    "h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]";

  return (
    <div className="text-[13px]">
      {/* Add new */}
      <div className="mb-3 rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-[#1d2327]">
            Add New Category or Tag
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-3 px-4 py-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block font-semibold text-[#1d2327]">
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Yoga Philosophy"
              aria-label="New term name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-[#1d2327]">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as "category" | "post_tag")
              }
              aria-label="New term type"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
            >
              <option value="category">Category</option>
              <option value="post_tag">Tag</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending}
            className="h-7 rounded-sm bg-[#2271b1] px-3 font-medium text-white hover:bg-[#135e96] disabled:opacity-50"
          >
            Add New
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          aria-label="Search terms"
          className="h-7 w-56 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
        />
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[#50575e]">
            Type{" "}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              aria-label="Filter by type"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
            >
              <option value="all">All</option>
              <option value="category">Categories</option>
              <option value="post_tag">Tags</option>
            </select>
          </label>
          <label className="text-[#50575e]">
            Sort{" "}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort terms"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
            >
              <option value="count">Count (high → low)</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-[12px] text-[#b32d2e]">{error}</p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Name</th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Slug</th>
              <th className="w-24 px-3 py-2 font-semibold text-[#2271b1]">
                Type
              </th>
              <th className="w-16 px-3 py-2 text-right font-semibold text-[#2271b1]">
                Count
              </th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-12 text-center text-[#50575e]"
                >
                  No categories or tags found.
                </td>
              </tr>
            ) : (
              visible.map((t) => {
                const isEditing = editId === t.id;
                const isMerging = mergeId === t.id;
                const otherTerms = terms.filter((o) => o.id !== t.id);
                return (
                  <tr
                    key={t.id}
                    className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                  >
                    {/* Name */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="Edit name"
                          className={inputCls}
                        />
                      ) : (
                        <span className="font-semibold text-[#2271b1]">
                          {t.name}
                        </span>
                      )}
                    </td>
                    {/* Slug */}
                    <td className="px-3 py-2 text-[#50575e]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          placeholder="auto from name"
                          aria-label="Edit slug"
                          className={inputCls}
                        />
                      ) : (
                        t.slug ?? "—"
                      )}
                    </td>
                    {/* Type badge */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-sm px-2 py-[1px] text-[11px] font-medium ${
                          t.taxonomy === "category"
                            ? "bg-[#e5f0f8] text-[#2271b1]"
                            : "bg-[#f0f0f1] text-[#50575e]"
                        }`}
                      >
                        {TYPE_LABEL[t.taxonomy]}
                      </span>
                    </td>
                    {/* Count */}
                    <td className="px-3 py-2 text-right tabular-nums text-[#1d2327]">
                      {t.count}
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(t.id)}
                            disabled={pending}
                            className="rounded-sm bg-[#2271b1] px-2 py-[2px] font-medium text-white hover:bg-[#135e96] disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={pending}
                            className="text-[#50575e] hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : isMerging ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={mergeTarget}
                            onChange={(e) => setMergeTarget(e.target.value)}
                            aria-label="Merge target"
                            className="h-7 max-w-[240px] rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
                          >
                            <option value="">Merge into…</option>
                            {otherTerms.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name} ({o.count}) — {TYPE_LABEL[o.taxonomy]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => confirmMerge(t)}
                            disabled={pending || !mergeTarget}
                            className="rounded-sm bg-[#2271b1] px-2 py-[2px] font-medium text-white hover:bg-[#135e96] disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={cancelMerge}
                            disabled={pending}
                            className="text-[#50575e] hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            disabled={pending}
                            className="text-[#2271b1] hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleType(t)}
                            disabled={pending}
                            className="text-[#2271b1] hover:underline disabled:opacity-50"
                          >
                            {t.taxonomy === "category"
                              ? "Make Tag"
                              : "Make Category"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startMerge(t)}
                            disabled={pending}
                            className="text-[#2271b1] hover:underline disabled:opacity-50"
                          >
                            Merge
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            disabled={pending}
                            className="text-[#b32d2e] hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[13px] text-[#50575e]">
        {visible.length} {visible.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
