"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import { OverlayFields } from "@/components/admin/blocks/OverlayFields";
import type { OrgBranding } from "@/config/brand-tokens";
import type { UiNavItem, UiSideMenuRightContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiSideMenuRightContent | null | undefined): UiSideMenuRightContent {
  return {
    overlay_z: c?.overlay_z ?? 50,
    overlay_anchor: c?.overlay_anchor ?? "right",
    overlay_trigger: c?.overlay_trigger ?? "on-menu",
    width_max_px: c?.width_max_px ?? 384,
    cta_label: c?.cta_label ?? "BOOK YOUR STAY",
    cta_href: c?.cta_href ?? "/rg-calendar/",
    items: c?.items ?? [],
  };
}

export default function UiSideMenuRightEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: UiSideMenuRightContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<UiSideMenuRightContent>
      {...props}
      typeSlug="ui_side_menu_right"
      isOverlay
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<UiSideMenuRightContent> }) {
  const { draft, patch } = state;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <OverlayFields draft={draft} patch={patch} />

        <label className="block">
          <span className={labelCls}>Drawer width (px)</span>
          <input
            type="number"
            className={inputCls}
            value={draft.width_max_px ?? 384}
            onChange={(e) => patch({ width_max_px: Number(e.target.value) || 384 })}
          />
        </label>
        <label className="block">
          <span className={labelCls}>CTA label</span>
          <input
            className={inputCls}
            value={draft.cta_label ?? ""}
            onChange={(e) => patch({ cta_label: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelCls}>CTA href</span>
          <input
            className={inputCls}
            value={draft.cta_href ?? ""}
            onChange={(e) => patch({ cta_href: e.target.value })}
          />
        </label>
      </div>

      <NavItemsEditor
        items={draft.items ?? []}
        onChange={(items) => patch({ items })}
      />
    </div>
  );
}

// ─── Items editor ──────────────────────────────────────────────────────

function NavItemsEditor({
  items,
  onChange,
}: {
  items: UiNavItem[];
  onChange: (items: UiNavItem[]) => void;
}) {
  function update(idx: number, next: UiNavItem) {
    const copy = items.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= items.length) return;
    const copy = items.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  }
  function append(item: UiNavItem) {
    onChange([...items, item]);
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-anamaya-charcoal">Menu items</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => append({ label: "New link", href: "/" })}
            className="rounded-full bg-anamaya-green px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Link
          </button>
          <button
            type="button"
            onClick={() => append({ label: "New group", children: [] })}
            className="rounded-full border border-anamaya-charcoal/30 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100"
          >
            + Group
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-300 bg-white p-4 text-center text-xs italic text-anamaya-charcoal/50">
          No items yet. Add a Link (single nav item) or a Group (collapsible sublist).
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx}>
              <NavItemRow
                item={it}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                onChange={(next) => update(idx, next)}
                onRemove={() => remove(idx)}
                onMoveUp={() => move(idx, -1)}
                onMoveDown={() => move(idx, 1)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NavItemRow({
  item,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: UiNavItem;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: UiNavItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isGroup = item.children !== undefined;
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
          >
            ↓
          </button>
        </div>

        <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input
            className={inputCls}
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
            placeholder="Label"
          />
          <input
            className={inputCls}
            value={item.href ?? ""}
            onChange={(e) => onChange({ ...item, href: e.target.value })}
            placeholder={isGroup ? "Optional href (groups can also link)" : "/path/"}
          />
          <button
            type="button"
            onClick={onRemove}
            className="self-stretch rounded border border-red-300 bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      {isGroup && (
        <div className="mt-3 border-l-2 border-anamaya-mint/60 pl-3">
          <ChildItemsEditor
            children_={item.children ?? []}
            onChange={(children) => onChange({ ...item, children })}
          />
        </div>
      )}
    </div>
  );
}

/** Only one level of nesting is supported in the editor — matches the
 *  legacy SIDE_MENU shape and keeps the UI flat enough to reason about.
 *  The renderer / type still accept arbitrary depth, so a future iteration
 *  can recurse if needed. */
function ChildItemsEditor({
  children_,
  onChange,
}: {
  children_: UiNavItem[];
  onChange: (next: UiNavItem[]) => void;
}) {
  function update(idx: number, next: UiNavItem) {
    const copy = children_.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(children_.filter((_, i) => i !== idx));
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= children_.length) return;
    const copy = children_.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  }
  function append() {
    onChange([...children_, { label: "New child", href: "/" }]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          Sub-items
        </span>
        <button
          type="button"
          onClick={append}
          className="rounded-full border border-anamaya-charcoal/30 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100"
        >
          + Sub-item
        </button>
      </div>

      {children_.length === 0 ? (
        <p className="text-[11px] italic text-anamaya-charcoal/50">
          No sub-items yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {children_.map((c, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded border border-zinc-300 bg-white px-1 text-[9px] leading-tight hover:bg-zinc-50 disabled:opacity-40"
                  title="Up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === children_.length - 1}
                  className="rounded border border-zinc-300 bg-white px-1 text-[9px] leading-tight hover:bg-zinc-50 disabled:opacity-40"
                  title="Down"
                >
                  ↓
                </button>
              </div>
              <input
                className={`${inputCls} text-xs`}
                value={c.label}
                onChange={(e) => update(idx, { ...c, label: e.target.value })}
                placeholder="Label"
              />
              <input
                className={`${inputCls} text-xs`}
                value={c.href ?? ""}
                onChange={(e) => update(idx, { ...c, href: e.target.value })}
                placeholder="/path/"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
