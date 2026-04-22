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
  iframe_height: number;
  block: { id: string; slug: string; name: string; type_slug: string };
};
type BlockOption = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  snapshot_url: string | null;
};

// Small icon buttons sized identically so the eye and + line up on the
// right edge of each row. Kept tiny + neutral so they don't compete
// with the block previews.
const ICON_BTN_SIZE = 26;

export default function TemplateEditor({
  templateId: _templateId,
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
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(() => new Set());
  const [inserterAt, setInserterAt] =
    useState<null | { beforeRowId?: string; afterAll?: boolean }>(null);

  if (!variant) {
    return (
      <div className="rounded-md bg-white p-6 text-sm italic text-anamaya-charcoal/60 ring-1 ring-zinc-200">
        This template has no variants yet.
      </div>
    );
  }

  function toggleWireframe(rowId: string) {
    setHiddenRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }
  function refresh() {
    router.refresh();
  }
  function handleInsertAfter(rowId: string, blockId: string) {
    const idx = rows.findIndex((r) => r.id === rowId);
    const next = rows[idx + 1];
    startTransition(async () => {
      if (next) await insertBlockBefore(variant!.id, next.id, blockId);
      else await appendBlockToVariant(variant!.id, blockId);
      setInserterAt(null);
      refresh();
    });
  }
  function handleAppend(blockId: string) {
    startTransition(async () => {
      await appendBlockToVariant(variant!.id, blockId);
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
    <div>
      <VariantHeader variant={variant} />

      {rows.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-zinc-300 p-8 text-center text-sm italic text-anamaya-charcoal/60">
          No blocks yet. Use the button below to add the first one.
        </div>
      )}

      {/* Blocks stack flush (no gap, square corners). Tabs (eye / +) live
          in a thin right-hand strip outside the preview so they never
          cover content. */}
      <div>
        {rows.map((row, idx) => (
          <TemplateRow
            key={row.id}
            row={row}
            isFirst={idx === 0}
            isLast={idx === rows.length - 1}
            wireframeOn={!hiddenRows.has(row.id)}
            pending={pending}
            onToggleWireframe={() => toggleWireframe(row.id)}
            onRemove={() => handleRemove(row.id)}
            onMoveUp={() => handleMove(row.id, -1)}
            onMoveDown={() => handleMove(row.id, 1)}
            onInsertAfter={() => setInserterAt({ beforeRowId: row.id })}
          />
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setInserterAt({ afterAll: true })}
          className="w-full rounded-md bg-anamaya-olive-dark py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
        >
          {rows.length === 0 ? "+ Add first block" : "+ Add block to end"}
        </button>
      </div>

      {inserterAt != null && (
        <BlockPickerModal
          allBlocks={allBlocks}
          onPick={(blockId) => {
            if (inserterAt.afterAll) handleAppend(blockId);
            else if (inserterAt.beforeRowId) handleInsertAfter(inserterAt.beforeRowId, blockId);
          }}
          onClose={() => setInserterAt(null)}
        />
      )}
    </div>
  );
}

function VariantHeader({ variant }: { variant: NonNullable<Variant> }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-xs text-anamaya-charcoal/70 ring-1 ring-zinc-200">
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

function TemplateRow({
  row,
  isFirst,
  isLast,
  wireframeOn,
  pending,
  onToggleWireframe,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
}: {
  row: Row;
  isFirst: boolean;
  isLast: boolean;
  wireframeOn: boolean;
  pending: boolean;
  onToggleWireframe: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: () => void;
}) {
  return (
    <section className="relative flex items-stretch">
      {/* Block preview. Square corners, no rounding. iframe is exactly as
          tall as the block's natural content — computed server-side. */}
      <div
        className="relative flex-1 overflow-hidden bg-white"
        style={{ height: row.iframe_height }}
      >
        <iframe
          src={`/block-preview/${row.block.slug}`}
          title={`Preview of ${row.block.name}`}
          className="block h-full w-full border-0"
        />
        {wireframeOn && (
          <div
            className="pointer-events-none absolute inset-0 border-2 border-anamaya-green"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Thin right strip holding both the Eye (top) and Plus (at the row
          junction). The strip itself has zero background; it's just the
          layout container for the two small buttons. */}
      <div className="relative w-10 shrink-0">
        {/* Eye — small rounded square, attached to the right edge of the
            green wireframe. Left corners flush, right corners rounded. */}
        <button
          type="button"
          onClick={onToggleWireframe}
          title={wireframeOn ? "Hide wireframe" : "Show wireframe"}
          aria-pressed={wireframeOn}
          className={`absolute left-0 top-2 flex items-center justify-center text-white rounded-l-none rounded-r-md transition-colors ${
            wireframeOn
              ? "bg-anamaya-green hover:bg-anamaya-green-dark"
              : "bg-zinc-400 hover:bg-zinc-500"
          }`}
          style={{ width: ICON_BTN_SIZE, height: ICON_BTN_SIZE }}
        >
          {wireframeOn ? <EyeIcon /> : <EyeOffIcon />}
        </button>

        {/* Plus — small fully-rounded square centered on the bottom edge
            of this row (so its centre sits on the line where this block
            and the next one meet). Hidden on the last row. */}
        {!isLast && (
          <button
            type="button"
            onClick={onInsertAfter}
            title="Insert a block here"
            className="absolute left-0 z-10 flex items-center justify-center rounded-md bg-anamaya-charcoal text-white shadow hover:bg-black"
            style={{
              width: ICON_BTN_SIZE,
              height: ICON_BTN_SIZE,
              top: "100%",
              transform: "translateY(-50%)",
            }}
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Info panel — to the right of the icon strip, outside the preview.
          Shown only when the wireframe is on so a "clean" view hides it. */}
      {wireframeOn && (
        <aside className="flex w-60 shrink-0 flex-col justify-between border-l border-zinc-200 bg-white p-3 text-xs">
          <div>
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
                onClick={onMoveUp}
                disabled={isFirst || pending}
                className="rounded border border-zinc-300 px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast || pending}
                className="rounded border border-zinc-300 px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                title="Move down"
              >
                ↓
              </button>
            </div>
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
      )}
    </section>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
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
                <div className="min-w-0 flex-1">
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
