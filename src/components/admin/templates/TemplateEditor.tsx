"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  appendBlockToVariant,
  insertBlockBefore,
  removeBlockFromVariant,
  moveBlockInVariant,
  updateBlockOverlayFields,
  setBlockLocked,
} from "@/app/admin/(default)/templates/actions";
import LivePreviewButton from "./LivePreviewButton";

type OverlayAnchor = "top" | "right" | "bottom" | "left" | "fullscreen";
type OverlayTrigger = "always" | "on-menu" | "on-scroll";
const ANCHORS: OverlayAnchor[] = ["top", "right", "bottom", "left", "fullscreen"];
const TRIGGERS: OverlayTrigger[] = ["always", "on-menu", "on-scroll"];

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
  /** Locked = pages using this template render the master block content.
   *  Unlocked = pages can supply per-page content via page_block_overrides. */
  is_locked: boolean;
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

type BlockGroup = {
  type_slug: string;
  type_name: string;
  is_overlay: boolean;
  blocks: BlockOption[];
};

const ICON_BTN_SIZE = 26;

export default function TemplateEditor({
  templateId: _templateId,
  variant,
  rows,
  allBlocks,
  blockGroups,
  referenceWidth,
  livePreviewUrl,
}: {
  templateId: string;
  variant: Variant;
  rows: Row[];
  allBlocks: BlockOption[];
  /** Block options grouped by block_type, sorted by block_types.sort_order
   *  so UI overlays sit at the top. Each group keeps the type's display
   *  name for the picker section header. */
  blockGroups: BlockGroup[];
  referenceWidth: number;
  /** Public preview URL for this template — rendered in the right
   *  gutter alongside the "+ Add block to end" button so editors can
   *  open the preview without scrolling back up to the header. */
  livePreviewUrl?: string;
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
  function handleToggleLock(rowId: string, nextLocked: boolean) {
    startTransition(async () => {
      await setBlockLocked(rowId, nextLocked);
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
            onToggleLock={() => handleToggleLock(row.id, !row.is_locked)}
          />
        ))}
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => setInserterAt({ afterAll: true })}
          className="w-full rounded-md bg-anamaya-olive-dark py-2 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
        >
          {rows.length === 0 ? "+ Add first block" : "+ Add block to end"}
        </button>
        {livePreviewUrl && (
          <div
            className="absolute"
            style={{
              left: "100%",
              marginLeft: 16,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <LivePreviewButton href={livePreviewUrl} />
          </div>
        )}
      </div>

      {inserterAt != null && (
        <BlockPickerModal
          allBlocks={allBlocks}
          blockGroups={blockGroups}
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
  onToggleLock,
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
  onToggleLock: () => void;
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
    // can anchor their gutters to the preview's edges.
    <section className="relative">
      {/* Dark left-side panel — single consolidated info + actions
          panel for every row. Replaces what used to be split between
          a right-gutter info panel and a left-gutter overlay panel.
          Overlay rows get an extra "Overlay" subsection at the bottom
          with anchor/trigger/z controls. */}
      <LeftInfoPanel
        blockId={row.block.id}
        blockName={row.block.name}
        blockSlug={row.block.slug}
        blockType={row.block.type_slug}
        isLocked={row.is_locked}
        isOverlay={row.is_overlay}
        overlayAnchor={(row.overlay_anchor as OverlayAnchor | null) ?? null}
        overlayTrigger={(row.overlay_trigger as OverlayTrigger | null) ?? null}
        overlayZ={row.overlay_z}
        isFirst={isFirst}
        isLast={isLast}
        pending={pending}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
        onToggleLock={onToggleLock}
      />
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

    </section>
  );
}

/**
 * Single dark panel in the left gutter of every row — identity +
 * actions for every block, plus an Overlay subsection (anchor /
 * trigger / z inline editor) for rows whose block_type has
 * is_overlay = true.
 *
 * Replaces the previous split layout (right-gutter info panel +
 * left-gutter overlay panel). Keeps the optimistic-update commit
 * flow for the overlay fields: each select fires updateBlockOverlayFields
 * immediately and useOptimistic updates the rendered value without
 * waiting on the round trip.
 */
function LeftInfoPanel({
  blockId,
  blockName,
  blockSlug,
  blockType,
  isLocked,
  isOverlay,
  overlayAnchor: anchor,
  overlayTrigger: trigger,
  overlayZ: z,
  isFirst,
  isLast,
  pending: parentPending,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleLock,
}: {
  blockId: string;
  blockName: string;
  blockSlug: string;
  blockType: string;
  isLocked: boolean;
  isOverlay: boolean;
  overlayAnchor: OverlayAnchor | null;
  overlayTrigger: OverlayTrigger | null;
  overlayZ: number | null;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleLock: () => void;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  // Optimistic mirrors of the server values. useOptimistic accepts the
  // prop as the canonical state and lets the UI show a pending change
  // for the duration of the transition; React resets to the prop value
  // automatically once the action settles + router refreshes.
  const [optAnchor, setOptAnchor] = useOptimistic<OverlayAnchor | null, OverlayAnchor>(
    anchor,
    (_, next) => next,
  );
  const [optTrigger, setOptTrigger] = useOptimistic<OverlayTrigger | null, OverlayTrigger>(
    trigger,
    (_, next) => next,
  );

  const disabled = busy || parentPending;

  function commit(patch: { overlay_anchor?: OverlayAnchor; overlay_trigger?: OverlayTrigger; overlay_z?: number }) {
    startTransition(async () => {
      if (patch.overlay_anchor) setOptAnchor(patch.overlay_anchor);
      if (patch.overlay_trigger) setOptTrigger(patch.overlay_trigger);
      await updateBlockOverlayFields(blockId, patch);
      router.refresh();
    });
  }

  return (
    <aside
      className="absolute z-10 w-44 rounded-l-md bg-anamaya-charcoal/90 p-2.5 text-[11px] text-white"
      style={{ right: "100%", top: 0, marginRight: 8 }}
    >
      {/* Identity */}
      <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60">
        {blockType}
      </div>
      <div className="mt-0.5 truncate font-semibold">{blockName}</div>
      <code className="mt-1 block truncate rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
        [#{blockSlug}]
      </code>

      {/* Lock toggle (full-width) */}
      <button
        type="button"
        onClick={onToggleLock}
        disabled={parentPending}
        title={
          isLocked
            ? "Locked — same content on every page using this template. Click to allow per-page customization."
            : "Unlocked — pages can supply per-page content for this slot. Click to lock."
        }
        className={`mt-2 flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
          isLocked
            ? "bg-white/15 text-white hover:bg-white/25"
            : "bg-anamaya-olive-dark text-white hover:opacity-90"
        }`}
      >
        {isLocked ? <LockClosedIcon /> : <LockOpenIcon />}
        {isLocked ? "Locked" : "Per-page"}
      </button>

      {/* Edit + move row */}
      <div className="mt-1.5 flex items-center gap-1">
        <Link
          href={`/admin/blocks/${blockId}`}
          target="_blank"
          className="flex-1 rounded bg-anamaya-green px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
        >
          Edit ↗
        </Link>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst || parentPending}
          className="rounded border border-white/20 bg-white/10 px-1.5 py-1 text-[9px] text-white hover:bg-white/20 disabled:opacity-40"
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast || parentPending}
          className="rounded border border-white/20 bg-white/10 px-1.5 py-1 text-[9px] text-white hover:bg-white/20 disabled:opacity-40"
          title="Move down"
        >
          ↓
        </button>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={parentPending}
        className="mt-1 w-full rounded border border-red-300/40 bg-red-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-red-200 hover:bg-red-500/20 disabled:opacity-50"
      >
        Remove
      </button>

      {/* Overlay subsection — only when this block is an overlay type */}
      {isOverlay && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Overlay
            </span>
            {busy && (
              <span className="text-[8px] italic text-white/50" aria-live="polite">
                saving…
              </span>
            )}
          </div>
          <label className="block">
            <span className="block text-[8px] uppercase tracking-wider text-white/50">
              anchor
            </span>
            <select
              disabled={disabled}
              value={optAnchor ?? ""}
              onChange={(e) => commit({ overlay_anchor: e.target.value as OverlayAnchor })}
              className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-white outline-none ring-1 ring-white/20 focus:ring-anamaya-mint disabled:opacity-50"
            >
              {!optAnchor && <option value="">—</option>}
              {ANCHORS.map((a) => (
                <option key={a} value={a} className="text-anamaya-charcoal">
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-1 block">
            <span className="block text-[8px] uppercase tracking-wider text-white/50">
              trigger
            </span>
            <select
              disabled={disabled}
              value={optTrigger ?? ""}
              onChange={(e) => commit({ overlay_trigger: e.target.value as OverlayTrigger })}
              className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-white outline-none ring-1 ring-white/20 focus:ring-anamaya-mint disabled:opacity-50"
            >
              {!optTrigger && <option value="">—</option>}
              {TRIGGERS.map((t) => (
                <option key={t} value={t} className="text-anamaya-charcoal">
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-1 block">
            <span className="block text-[8px] uppercase tracking-wider text-white/50">
              z-index
            </span>
            <input
              key={`z-${z ?? "null"}`}
              type="number"
              disabled={disabled}
              defaultValue={z ?? ""}
              onBlur={(e) => {
                const raw = e.currentTarget.value;
                if (raw === "") return;
                const next = Number(raw);
                if (!Number.isFinite(next) || next === z) return;
                commit({ overlay_z: next });
              }}
              className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-white outline-none ring-1 ring-white/20 focus:ring-anamaya-mint disabled:opacity-50"
            />
          </label>
        </div>
      )}
    </aside>
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
function LockClosedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="1.5" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
function LockOpenIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 7-2" />
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
  blockGroups,
  onPick,
  onClose,
}: {
  allBlocks: BlockOption[];
  blockGroups: BlockGroup[];
  onPick: (blockId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // When searching, show a flat list (across all types). When not
  // searching, show grouped sections so the user can scan by category.
  const flatHits: BlockOption[] = useMemo(() => {
    if (!q) return [];
    return allBlocks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.type_slug.toLowerCase().includes(q),
    );
  }, [allBlocks, q]);

  const totalCount = allBlocks.length;

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
          <div>
            <h3 className="text-sm font-semibold text-anamaya-charcoal">Pick a block</h3>
            <p className="mt-0.5 text-[11px] text-anamaya-charcoal/60">
              {totalCount} block{totalCount === 1 ? "" : "s"} across{" "}
              {blockGroups.length} type{blockGroups.length === 1 ? "" : "s"}
            </p>
          </div>
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

        <div className="max-h-[60vh] overflow-y-auto">
          {q ? (
            <FlatList items={flatHits} onPick={onPick} />
          ) : blockGroups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm italic text-anamaya-charcoal/60">
              No blocks exist yet. Create one at{" "}
              <span className="font-mono">/admin/blocks</span>.
            </p>
          ) : (
            blockGroups.map((g) => (
              <section key={g.type_slug}>
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-anamaya-charcoal/80">
                    {g.type_name}
                    {g.is_overlay && (
                      <span className="ml-2 rounded bg-anamaya-charcoal px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white">
                        overlay
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-anamaya-charcoal/50">
                    {g.type_slug} · {g.blocks.length}
                  </span>
                </header>
                <ul className="divide-y divide-zinc-100">
                  {g.blocks.map((b) => (
                    <BlockRow key={b.id} block={b} onPick={onPick} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FlatList({
  items,
  onPick,
}: {
  items: BlockOption[];
  onPick: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm italic text-anamaya-charcoal/60">
        No blocks match.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((b) => (
        <BlockRow key={b.id} block={b} onPick={onPick} />
      ))}
    </ul>
  );
}

function BlockRow({
  block,
  onPick,
}: {
  block: BlockOption;
  onPick: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(block.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
      >
        <div className="h-10 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-100">
          {block.snapshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.snapshot_url}
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
          <div className="truncate text-sm font-semibold text-anamaya-charcoal">
            {block.name}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-anamaya-charcoal/60">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">
              [#{block.slug}]
            </span>
            <span className="italic">{block.type_slug}</span>
          </div>
        </div>
      </button>
    </li>
  );
}
