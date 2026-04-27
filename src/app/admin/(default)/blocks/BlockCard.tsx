"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBlock, duplicateBlock } from "./actions";

type Block = {
  id: string;
  name: string;
  slug: string;
  snapshot_url: string | null;
};

const btnCls =
  "rounded-md bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal ring-1 ring-zinc-200 hover:bg-anamaya-green hover:text-white hover:ring-anamaya-green disabled:opacity-50";
const trashBtnCls =
  "rounded-md bg-white p-1.5 text-anamaya-charcoal ring-1 ring-zinc-200 hover:bg-red-600 hover:text-white hover:ring-red-700 disabled:opacity-50";

export default function BlockCard({ block }: { block: Block }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDuplicate() {
    startTransition(async () => {
      try {
        await duplicateBlock(block.id);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to duplicate";
        setError(msg);
        if (typeof window !== "undefined") window.alert(`Duplicate failed: ${msg}`);
      }
    });
  }

  function openDelete() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function cancelDelete() {
    dialogRef.current?.close();
  }

  function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await deleteBlock(block.id);
        dialogRef.current?.close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="relative h-full">
      <Link
        href={`/admin/blocks/${block.id}`}
        className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md"
      >
        <div className="px-4 pb-3 pr-44 pt-4">
          <div className="break-words text-sm font-semibold text-anamaya-charcoal">
            {block.name}
          </div>
          <code className="mt-1 inline-block max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-anamaya-charcoal/80">
            [#{block.slug}]
          </code>
        </div>
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          {block.snapshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.snapshot_url}
              alt=""
              className="block h-auto w-full"
              loading="lazy"
            />
          ) : (
            <div className="px-4 py-10 text-xs italic text-anamaya-charcoal/40">
              No preview
            </div>
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <Link href={`/admin/blocks/${block.id}`} title="Edit" className={btnCls}>
          Edit
        </Link>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={pending}
          title="Duplicate"
          className={btnCls}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={openDelete}
          disabled={pending}
          title="Delete"
          aria-label="Delete"
          className={trashBtnCls}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 m-0 w-[28rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-anamaya-olive-dark/20 bg-anamaya-cream p-0 shadow-2xl backdrop:bg-anamaya-charcoal/50 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === dialogRef.current) cancelDelete();
        }}
      >
        <form onSubmit={confirmDelete} className="m-0">
          <header className="flex items-center gap-3 border-b border-anamaya-olive-dark/10 px-6 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </span>
            <h3 className="font-heading text-lg font-semibold text-anamaya-charcoal">
              Delete this block?
            </h3>
          </header>
          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-anamaya-charcoal/80">
              <span className="font-semibold text-anamaya-charcoal">{block.name}</span>{" "}
              will be removed from every page that uses it. This can&apos;t be undone.
            </p>
            {error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-100">
                {error}
              </p>
            )}
          </div>
          <footer className="flex items-center justify-end gap-2 rounded-b-xl bg-white/60 px-6 py-4">
            <button
              type="button"
              onClick={cancelDelete}
              disabled={pending}
              className="rounded-full border border-anamaya-olive-dark/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
