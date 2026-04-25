"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate, duplicateTemplate } from "@/app/admin/(default)/templates/actions";

export type TemplateCardBlock = {
  id: string;
  name: string;
  snapshot_url: string | null;
};

export default function TemplateCard({
  id,
  slug,
  name,
  blocks,
}: {
  id: string;
  slug: string;
  name: string;
  blocks: TemplateCardBlock[];
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function handleDuplicate() {
    setMenuOpen(false);
    startTransition(async () => {
      const newId = await duplicateTemplate(id);
      router.push(`/admin/templates/${newId}`);
    });
  }
  function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteTemplate(id);
      router.refresh();
    });
  }

  return (
    <article
      className="relative flex w-[300px] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ maxHeight: 1200 }}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-2 border-b border-zinc-100 px-3 py-2">
        <Link href={`/admin/templates/${id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-anamaya-charcoal hover:text-anamaya-green">
            {name}
          </h3>
          <code className="mt-0.5 inline-block truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-anamaya-charcoal/70">
            {slug}
          </code>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Template actions"
            className="flex h-7 w-7 items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-8 z-20 flex w-36 flex-col overflow-hidden rounded-md bg-white text-xs font-semibold shadow-lg ring-1 ring-zinc-200"
            >
              <Link
                href={`/admin/templates/${id}`}
                className="whitespace-nowrap px-3 py-2 text-left uppercase tracking-wider text-anamaya-charcoal hover:bg-anamaya-green hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={handleDuplicate}
                className="border-t border-zinc-100 px-3 py-2 text-left uppercase tracking-wider text-anamaya-charcoal hover:bg-anamaya-green hover:text-white disabled:opacity-50"
              >
                Duplicate
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="border-t border-zinc-100 px-3 py-2 text-left uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body: stack of block snapshots at the template's aspect */}
      <Link
        href={`/admin/templates/${id}`}
        className="block flex-1 overflow-hidden bg-zinc-50"
      >
        {blocks.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs italic text-anamaya-charcoal/50">
            No blocks yet
          </div>
        ) : (
          <div className="flex flex-col">
            {blocks.map((b) => (
              <div key={b.id} className="relative">
                {b.snapshot_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.snapshot_url}
                    alt={b.name}
                    className="block w-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-12 items-center justify-center bg-zinc-100 text-[10px] italic text-anamaya-charcoal/40">
                    {b.name} — no preview
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}
