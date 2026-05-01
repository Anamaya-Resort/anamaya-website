"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  appendBlockToVariant,
  insertBlockBefore,
  removeBlockFromVariant,
  moveBlockInVariant,
} from "@/app/admin/(default)/templates/actions";

type Variant = { id: string; slug: string; name: string; is_default: boolean } | null;
type Row = {
  id: string;
  sort_order: number;
  aspect_ratio: number;
  native_height: number;
  /** When true, the row's block_type has is_overlay = true. The row gets
   *  a left gutter showing per-instance overlay metadata, and overlay
   *  rows are sorted to the top of the list to mirror their fixed-position
   *  rendering on the live site. */
  is_overlay: boolean;
  overlay_z: number | null;
  overlay_anchor: string | null;
  overlay_trigger: string | null;
  block: { id: string; slug: string; name: string; type_slug: string };
};
type BlockOption = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  snapshot_url: string | null;
};

const ICON_BTN_SIZE = 26;

export default function TemplateEditor({
  templateId: _templateId,
  variant,
  rows,
  allBlocks,
  referenceWidth,
}: {
  templateId: string;
  variant: Variant;
  rows: Row[];
  allBlocks: BlockOption[];
  referenceWidth: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Per-row wireframe visibility. Toggle with the eye tab. ONLY controls
  // the green outline — the info panel stays visible regardless.
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

      {/* Blocks stack flush (no gap, square corners). Preview takes the
          full admin-content width; eye/+/info are absolutely positioned
          into the right gutter so the preview isn't shrunk by them. */}
      <div>
        {rows.map((row, idx) => (
          <TemplateRow
            key={row.id}
            row={row}
            isFirst={idx === 0}
            isLast={idx === rows.length - 1}
            wireframeOn={!hiddenRows.has(row.id)}
            pending={pending}
            referenceWidth={referenceWidth}
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
  referenceWidth,
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
  referenceWidth: number;
  onToggleWireframe: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: () => void;
}) {
  // Each iframe starts at the server-estimated native_height, but rich
  // text and any block whose rendered height differs from the estimate
  // will posts its real document.scrollHeight back via postMessage
  // (emitted by <BlockPreviewMeasurer> inside /block-preview). We use
  // that to replace native_height and keep the wrapper tight.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(row.native_height);

  useEffect(() => {
    // Reset to the server estimate when the block identity changes.
    setMeasuredHeight(row.native_height);
  }, [row.block.slug, row.native_height]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; height?: number } | null;
      if (!data || data.type !== "block-preview-height") return;
      if (typeof data.height !== "number" || data.height <= 0) return;
      setMeasuredHeight(Math.round(data.height));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const nativeHeight = Math.max(1, measuredHeight);
  const aspectRatio = referenceWidth / nativeHeight;

  return (
    // position: relative on the row so the absolute-positioned controls
    // can anchor their right gutter to the preview's right edge.
    <section className="relative">
      {/* Left gutter — only rendered for overlay rows. Shows the per-instance
          overlay structural fields (anchor / z / trigger) as read-only
          badges; future iterations may make these inline-editable. */}
      {row.is_overlay && (
        <aside
          className="absolute z-10 w-32 rounded-l-md bg-anamaya-charcoal/90 p-2 text-[10px] font-medium text-white"
          style={{ right: "100%", top: 0, marginRight: 8 }}
        >
          <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Overlay
          </div>
          <div className="space-y-0.5">
            <div>
              <span className="text-white/60">anchor: </span>
              <span className="font-mono">{row.overlay_anchor ?? "—"}</span>
            </div>
            <div>
              <span className="text-white/60">z: </span>
              <span className="font-mono">{row.overlay_z ?? "—"}</span>
            </div>
            <div>
              <span className="text-white/60">trigger: </span>
              <span className="font-mono">{row.overlay_trigger ?? "—"}</span>
            </div>
          </div>
        </aside>
      )}
      {/* Preview takes the full admin-content width. overflow-hidden so
          the scaled-down native-size iframe is clipped to the wrapper. */}
      <div
        className="relative w-full overflow-hidden bg-white"
        style={{
          aspectRatio,
          containerType: "inline-size",
        }}
      >
        <iframe
          ref={iframeRef}
          src={`/block-preview/${row.block.slug}`}
          title={`Preview of ${row.block.name}`}
          className="absolute left-0 top-0 border-0"
          style={{
            width: referenceWidth,
            height: nativeHeight,
            transformOrigin: "top left",
            transform: `scale(calc(100cqw / ${referenceWidth}px))`,
          }}
        />
        {wireframeOn && (
          <div
            className="pointer-events-none absolute inset-0 border-2 border-anamaya-green"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Eye — small square flush against the right edge of the green
          line, overflowing into the right gutter. Moved down 20 px from
          the top so it doesn't collide with the + above it. */}
      <button
        type="button"
        onClick={onToggleWireframe}
        title={wireframeOn ? "Hide wireframe" : "Show wireframe"}
        aria-pressed={wireframeOn}
        className={`absolute flex items-center justify-center rounded-r-md text-white transition-colors ${
          wireframeOn
            ? "bg-anamaya-green hover:bg-anamaya-green-dark"
            : "bg-zinc-400 hover:bg-zinc-500"
        }`}
        style={{
          left: "100%",
          top: 28,
          width: ICON_BTN_SIZE,
          height: ICON_BTN_SIZE,
        }}
      >
        {wireframeOn ? <EyeIcon /> : <EyeOffIcon />}
      </button>

      {/* Plus — centered exactly on the row junction. Absolute position,
          placed in the same right gutter column as the eye. */}
      {!isLast && (
        <button
          type="button"
          onClick={onInsertAfter}
          title="Insert a block here"
          className="absolute z-10 flex items-center justify-center rounded-md bg-anamaya-charcoal text-white shadow hover:bg-black"
          style={{
            left: "100%",
            top: "100%",
            transform: "translateY(-50%)",
            width: ICON_BTN_SIZE,
            height: ICON_BTN_SIZE,
          }}
        >
          <PlusIcon />
        </button>
      )}

      {/* Info panel — further right, beyond the eye column. Compact and
          self-contained. Doesn't stretch to the row's height. */}
      <aside
        className="absolute w-48 bg-white p-2.5 text-[11px] ring-1 ring-zinc-200"
        style={{ left: "100%", top: 0, marginLeft: ICON_BTN_SIZE + 8 }}
      >
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-anamaya-charcoal/60">
          {row.block.type_slug}
        </div>
        <div className="truncate font-semibold text-anamaya-charcoal">
          {row.block.name}
        </div>
        <code className="mt-1 block truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-anamaya-charcoal/80">
          [#{row.block.slug}]
        </code>
        <div className="mt-1.5 flex items-center gap-1">
          <Link
            href={`/admin/blocks/${row.block.id}`}
            target="_blank"
            className="flex-1 rounded bg-anamaya-green px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Edit ↗
          </Link>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || pending}
            className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-[9px] hover:bg-zinc-50 disabled:opacity-40"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || pending}
            className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-[9px] hover:bg-zinc-50 disabled:opacity-40"
            title="Move down"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="mt-1 w-full rounded border border-red-300 bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Remove
        </button>
      </aside>
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
