"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  appendBlockToVariant,
  insertBlockBefore,
  removeBlockFromVariant,
  moveBlockInVariant,
} from "@/app/admin/templates/actions";

type Variant = { id: string; slug: string; name: string; is_default: boolean } | null;
type Row = {
  id: string;
  sort_order: number;
  block: { id: string; slug: string; name: string; type_slug: string };
};
type BlockOption = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  snapshot_url: string | null;
};

export default function TemplateEditor({
  templateId,
  variant,
  rows,
  allBlocks,
}: {
  templateId: string;
  variant: Variant;
  rows: Row[];
  allBlocks: BlockOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inserterAt, setInserterAt] = useState<null | { beforeRowId?: string }>(null);

  if (!variant) {
    return (
      <div className="rounded-md bg-white p-6 text-sm italic text-anamaya-charcoal/60 ring-1 ring-zinc-200">
        This template has no variants yet.
      </div>
    );
  }

  function refresh() {
    router.refresh();
  }

  function handleAppend(blockId: string) {
    startTransition(async () => {
      await appendBlockToVariant(variant!.id, blockId);
      setInserterAt(null);
      refresh();
    });
  }
  function handleInsertBefore(rowId: string, blockId: string) {
    startTransition(async () => {
      await insertBlockBefore(variant!.id, rowId, blockId);
      setInserterAt(null);
      refresh();
    });
  }
  function handleRemove(rowId: string) {
    if (!confirm("Remove this block from the template?")) return;
    startTransition(async () => {
      await removeBlockFromVariant(rowId);
      refresh();
    });
  }
  function handleMove(rowId: string, delta: -1 | 1) {
    startTransition(async () => {
      await moveBlockInVariant(rowId, delta);
      refresh();
    });
  }

  return (
    <div className="space-y-3">
      <VariantHeader variant={variant} />

      {rows.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-zinc-300 p-8 text-center text-sm italic text-anamaya-charcoal/60">
          No blocks yet. Use the button below to add the first one.
        </div>
      )}

      {rows.map((row, idx) => (
        <div key={row.id}>
          <Inserter
            onPick={(blockId) => handleInsertBefore(row.id, blockId)}
            isOpen={inserterAt?.beforeRowId === row.id}
            onOpen={() => setInserterAt({ beforeRowId: row.id })}
            onClose={() => setInserterAt(null)}
            allBlocks={allBlocks}
            label="Insert block here"
          />
          <BlockFrame
            row={row}
            isFirst={idx === 0}
            isLast={idx === rows.length - 1}
            onRemove={() => handleRemove(row.id)}
            onMove={(delta) => handleMove(row.id, delta)}
            pending={pending}
          />
        </div>
      ))}

      <Inserter
        onPick={handleAppend}
        isOpen={inserterAt != null && !inserterAt.beforeRowId}
        onOpen={() => setInserterAt({})}
        onClose={() => setInserterAt(null)}
        allBlocks={allBlocks}
        label={rows.length === 0 ? "+ Add first block" : "+ Add block to end"}
        solid
      />
    </div>
  );
}

/** Thin subheader showing the active variant and a placeholder for future A/B UI. */
function VariantHeader({ variant }: { variant: NonNullable<Variant> }) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-xs text-anamaya-charcoal/70 ring-1 ring-zinc-200">
      <div>
        <span className="font-semibold">{variant.name}</span>
        <code className="ml-2 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-zinc-200">
          {variant.slug}
        </code>
      </div>
      <span className="italic text-anamaya-charcoal/50">A/B variant picker coming later</span>
    </div>
  );
}

/**
 * Wraps a block preview with a bright green outline wireframe and a
 * floating info box in the top-right. The preview is an <iframe> so the
 * block renders at natural viewport width without the admin's chrome
 * affecting its layout, and without the live hero's transparent header
 * bleeding into the admin page.
 */
function BlockFrame({
  row,
  isFirst,
  isLast,
  onRemove,
  onMove,
  pending,
}: {
  row: Row;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  pending: boolean;
}) {
  const src = `/block-preview/${row.block.slug}`;
  return (
    <section className="relative isolate my-3">
      {/* Bright green wireframe — uses anamaya-green brand token. */}
      <div className="relative overflow-hidden rounded-md ring-4 ring-anamaya-green">
        <iframe
          src={src}
          title={`Preview of ${row.block.name}`}
          className="block h-[520px] w-full border-0 bg-white"
          // height is a reasonable default; hero cover mode is 80vh of the
          // iframe's own viewport, which ends up ~520px on a 700-800px iframe.
        />
      </div>

      {/* Floating info box */}
      <aside className="pointer-events-auto absolute right-2 top-2 z-20 w-56 rounded-md bg-white/95 p-3 text-xs shadow-lg ring-1 ring-zinc-200 backdrop-blur-sm">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-anamaya-charcoal/60">
          {row.block.type_slug}
        </div>
        <div className="font-semibold text-anamaya-charcoal">{row.block.name}</div>
        <code className="mt-1 block truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-anamaya-charcoal/80">
          [#{row.block.slug}]
        </code>
        <div className="mt-2 flex items-center gap-1">
          <Link
            href={`/admin/blocks/${row.block.id}`}
            target="_blank"
            className="flex-1 rounded bg-anamaya-green px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Edit ↗
          </Link>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst || pending}
            className="rounded border border-zinc-300 px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(+1)}
            disabled={isLast || pending}
            className="rounded border border-zinc-300 px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
            title="Move down"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="mt-2 w-full rounded border border-red-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Remove
        </button>
      </aside>
    </section>
  );
}

/** Thin "+ Insert" zone between blocks. Clicking opens the block picker. */
function Inserter({
  onPick,
  onOpen,
  onClose,
  isOpen,
  allBlocks,
  label,
  solid = false,
}: {
  onPick: (blockId: string) => void;
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
  allBlocks: BlockOption[];
  label: string;
  solid?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className={
          solid
            ? "w-full rounded-md bg-anamaya-olive-dark py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
            : "group flex w-full items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/40 hover:text-anamaya-charcoal"
        }
      >
        {solid ? label : (
          <span className="flex items-center gap-2">
            <span className="h-px w-full min-w-10 bg-zinc-200 group-hover:bg-anamaya-charcoal/30" />
            <span>+ {label}</span>
            <span className="h-px w-full min-w-10 bg-zinc-200 group-hover:bg-anamaya-charcoal/30" />
          </span>
        )}
      </button>
      {isOpen && (
        <BlockPickerModal
          allBlocks={allBlocks}
          onPick={onPick}
          onClose={onClose}
        />
      )}
    </>
  );
}

function BlockPickerModal({
  allBlocks,
  onPick,
  onClose,
}: {
  allBlocks: BlockOption[];
  onPick: (blockId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allBlocks;
    return allBlocks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.type_slug.toLowerCase().includes(q),
    );
  }, [allBlocks, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-anamaya-charcoal">Pick a block</h3>
          <button
            onClick={onClose}
            className="rounded border border-zinc-300 px-2 py-1 text-[10px] uppercase tracking-wider text-anamaya-charcoal/70 hover:bg-zinc-50"
          >
            Close
          </button>
        </header>
        <div className="border-b border-zinc-200 px-4 py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug or type…"
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </div>
        <ul className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm italic text-anamaya-charcoal/60">
              No blocks match.
            </li>
          )}
          {filtered.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onPick(b.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
              >
                <div className="h-10 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-100">
                  {b.snapshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.snapshot_url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[9px] italic text-anamaya-charcoal/40">
                      No preview
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-anamaya-charcoal">{b.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-anamaya-charcoal/60">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">
                      [#{b.slug}]
                    </span>
                    <span className="italic">{b.type_slug}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
