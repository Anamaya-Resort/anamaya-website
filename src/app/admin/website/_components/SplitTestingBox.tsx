"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SplitContext } from "@/lib/website-builder/split-testing";
import {
  makeTestVariant,
  addArticleToGroup,
  removeFromTestGroup,
} from "../split-testing/actions";

/**
 * Right-rail "Split Testing" box on the edit page. Shows the article's test
 * group (original + variants) with links, and the actions: make a new variant
 * (clone of the original), add this page to an existing group, or remove it.
 */
export default function SplitTestingBox({
  context,
  articleId,
}: {
  context: SplitContext;
  articleId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function onMakeVariant() {
    setBusy(true);
    try {
      const { editHref } = await makeTestVariant(articleId);
      if (editHref) router.push(editHref);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(groupId: string) {
    setBusy(true);
    try {
      await addArticleToGroup(articleId, groupId);
      setModalOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    const msg = context.thisIsControl
      ? "Remove the original from the test? This dissolves the whole group (the variant pages are kept)."
      : "Remove this variant from the test group?";
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await removeFromTestGroup(articleId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-sm border border-[#c3c4c7] bg-white">
      <div className="border-b border-[#c3c4c7] bg-[#3c434a] px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-white">
        Split Testing
      </div>
      <div className="space-y-3 px-3 py-3 text-[13px]">
        {context.inGroup && context.group ? (
          <>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1d2327]">
                {context.group.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                  context.group.status === "running"
                    ? "bg-[#eaf6ec] text-[#1e7e34]"
                    : "bg-[#f0f0f1] text-[#50575e]"
                }`}
              >
                {context.group.status}
              </span>
            </div>

            <ul className="space-y-1">
              {context.members.map((m) => {
                const isThis = m.id === articleId;
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="text-[#8c8f94]">
                      {m.isControl ? "●" : "↳"}
                    </span>
                    <span className="rounded-full bg-[#e7eef7] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2271b1]">
                      {m.label}
                    </span>
                    {isThis ? (
                      <span className="font-semibold text-[#1d2327]">
                        {m.title}{" "}
                        <span className="text-[11px] font-normal text-[#50575e]">
                          (this page)
                        </span>
                      </span>
                    ) : m.slug ? (
                      <Link
                        href={`/admin/website/${m.slug}/${m.id}`}
                        className="truncate text-[#2271b1] hover:text-[#135e96] hover:underline"
                      >
                        {m.title}
                      </Link>
                    ) : (
                      <span className="truncate text-[#1d2327]">{m.title}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-2 border-t border-[#dcdcde] pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={onMakeVariant}
                className="rounded-full bg-[#2271b1] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#135e96] disabled:opacity-50"
              >
                Make Test Variant
              </button>
              <Link
                href="/admin/website/split-testing"
                className="rounded-full border border-[#8c8f94] px-3 py-1 text-[12px] font-semibold text-[#2271b1] hover:bg-[#f6fbfd]"
              >
                Analytics
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="text-[12px] text-[#b32d2e] hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[#50575e]">
              This page isn&apos;t part of a split test. Make a variant to test a
              new version against it, or add it to an existing group.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onMakeVariant}
                className="rounded-full bg-[#2271b1] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#135e96] disabled:opacity-50"
              >
                Make Test Variant
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setModalOpen(true)}
                className="rounded-full border border-[#8c8f94] px-3 py-1 text-[12px] font-semibold text-[#2271b1] hover:bg-[#f6fbfd] disabled:opacity-50"
              >
                Add to Test Group
              </button>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-md bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[15px] font-semibold text-[#1d2327]">
              Add to a test group
            </h3>
            {context.availableGroups.length === 0 ? (
              <p className="text-[13px] text-[#50575e]">
                No test groups yet. Use <strong>Make Test Variant</strong> to
                start one, or select pages in a list and choose{" "}
                <strong>Make Test Group</strong>.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-auto">
                {context.availableGroups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAdd(g.id)}
                      className="flex w-full items-center justify-between rounded-sm border border-[#dcdcde] px-3 py-2 text-left text-[13px] hover:bg-[#f6f7f7] disabled:opacity-50"
                    >
                      <span className="font-medium text-[#1d2327]">
                        {g.name}
                      </span>
                      <span className="text-[11px] uppercase text-[#50575e]">
                        {g.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-[#8c8f94] px-3 py-1 text-[12px] text-[#50575e] hover:bg-[#f6f7f7]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
