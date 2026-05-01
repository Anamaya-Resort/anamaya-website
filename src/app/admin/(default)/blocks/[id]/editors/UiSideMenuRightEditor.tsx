"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import { OverlayFields } from "@/components/admin/blocks/OverlayFields";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
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
    bg_color: c?.bg_color ?? "",
    bg_opacity: c?.bg_opacity ?? 90,
    headline_font: c?.headline_font ?? "heading",
    headline_size_px: c?.headline_size_px ?? 14,
    headline_color: c?.headline_color ?? "",
    headline_bold: c?.headline_bold ?? false,
    headline_italic: c?.headline_italic ?? false,
    content_font: c?.content_font ?? "body",
    content_size_px: c?.content_size_px ?? 14,
    content_color: c?.content_color ?? "",
    content_bold: c?.content_bold ?? false,
    content_italic: c?.content_italic ?? false,
    decoration_top_url: c?.decoration_top_url ?? "",
    decoration_top_alt: c?.decoration_top_alt ?? "",
    decoration_top_height_px: c?.decoration_top_height_px ?? 80,
    decoration_bottom_url: c?.decoration_bottom_url ?? "",
    decoration_bottom_alt: c?.decoration_bottom_alt ?? "",
    decoration_bottom_height_px: c?.decoration_bottom_height_px ?? 80,
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
  const { draft, patch, brandTokens } = state;
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

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Background</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Drawer fill color and translucency. The drawer keeps its
            backdrop blur regardless.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Leave on Auto for the default charcoal.
            </p>
          </div>
          <label className="block">
            <span className={labelCls}>Opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.bg_opacity ?? 90}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  bg_opacity: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 90,
                });
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Typography</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Headlines = top-level rows (links + group headers). Contents =
            sub-items inside expanded groups.
          </p>
        </header>

        <div className="space-y-4">
          <TypeFieldset
            label="Headlines"
            font={draft.headline_font ?? "heading"}
            sizePx={draft.headline_size_px ?? 14}
            color={draft.headline_color ?? ""}
            bold={draft.headline_bold ?? false}
            italic={draft.headline_italic ?? false}
            brandTokens={brandTokens}
            onChange={(p) =>
              patch({
                headline_font: p.font ?? draft.headline_font,
                headline_size_px: p.sizePx ?? draft.headline_size_px,
                headline_color: p.color ?? draft.headline_color,
                headline_bold: p.bold ?? draft.headline_bold,
                headline_italic: p.italic ?? draft.headline_italic,
              })
            }
          />

          <TypeFieldset
            label="Contents"
            font={draft.content_font ?? "body"}
            sizePx={draft.content_size_px ?? 14}
            color={draft.content_color ?? ""}
            bold={draft.content_bold ?? false}
            italic={draft.content_italic ?? false}
            brandTokens={brandTokens}
            onChange={(p) =>
              patch({
                content_font: p.font ?? draft.content_font,
                content_size_px: p.sizePx ?? draft.content_size_px,
                content_color: p.color ?? draft.content_color,
                content_bold: p.bold ?? draft.content_bold,
                content_italic: p.italic ?? draft.content_italic,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Decorative graphics
          </h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Optional images at the top (above the auth block) and bottom
            (below the CTA) of the drawer to break up the link list.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <DecorationField
            label="Top decoration"
            url={draft.decoration_top_url}
            alt={draft.decoration_top_alt}
            heightPx={draft.decoration_top_height_px ?? 80}
            onChange={(u, a, h) =>
              patch({
                decoration_top_url: u,
                decoration_top_alt: a,
                decoration_top_height_px: h,
              })
            }
          />
          <DecorationField
            label="Bottom decoration"
            url={draft.decoration_bottom_url}
            alt={draft.decoration_bottom_alt}
            heightPx={draft.decoration_bottom_height_px ?? 80}
            onChange={(u, a, h) =>
              patch({
                decoration_bottom_url: u,
                decoration_bottom_alt: a,
                decoration_bottom_height_px: h,
              })
            }
          />
        </div>
      </section>

      <NavItemsEditor
        items={draft.items ?? []}
        onChange={(items) => patch({ items })}
      />
    </div>
  );
}

// ─── Typography fieldset ───────────────────────────────────────────────

function TypeFieldset({
  label,
  font,
  sizePx,
  color,
  bold,
  italic,
  brandTokens,
  onChange,
}: {
  label: string;
  font: "body" | "heading";
  sizePx: number;
  color: string;
  bold: boolean;
  italic: boolean;
  brandTokens: BlockEditorState<UiSideMenuRightContent>["brandTokens"];
  onChange: (p: {
    font?: "body" | "heading";
    sizePx?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
  }) => void;
}) {
  return (
    <fieldset className="rounded border border-zinc-200 bg-white p-3">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        {label}
      </legend>
      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-anamaya-charcoal/70">
            Family
          </span>
          <select
            className={`${inputCls} mt-0.5`}
            value={font}
            onChange={(e) => onChange({ font: e.target.value as "body" | "heading" })}
          >
            <option value="body">Body</option>
            <option value="heading">Heading</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-anamaya-charcoal/70">
            Size (px)
          </span>
          <input
            type="number"
            min={8}
            max={48}
            className={`${inputCls} mt-0.5 w-20`}
            value={sizePx}
            onChange={(e) => onChange({ sizePx: Number(e.target.value) || 14 })}
          />
        </label>
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-anamaya-charcoal/70">
            Color
          </span>
          <BrandColorSelect
            value={color}
            onChange={(v) => onChange({ color: v })}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={bold}
            onChange={(e) => onChange({ bold: e.target.checked })}
          />
          Bold
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={italic}
            onChange={(e) => onChange({ italic: e.target.checked })}
          />
          Italic
        </label>
      </div>
    </fieldset>
  );
}

// ─── Decoration field ──────────────────────────────────────────────────

function DecorationField({
  label,
  url,
  alt,
  heightPx,
  onChange,
}: {
  label: string;
  url: string | undefined;
  alt: string | undefined;
  heightPx: number;
  onChange: (url: string, alt: string, heightPx: number) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="rounded-md border border-zinc-200 bg-anamaya-charcoal p-2">
        <div className="flex items-center justify-center" style={{ minHeight: 80 }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={alt ?? ""}
              style={{ maxHeight: heightPx }}
              className="max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] italic text-white/50">no image</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ImageUploadButton
            value={url}
            onUploaded={(u) => onChange(u, alt ?? "", heightPx)}
            kind="ui-overlays"
            maxWidth={1200}
          />
          {url && (
            <button
              type="button"
              onClick={() => onChange("", alt ?? "", heightPx)}
              className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input
          className={inputCls}
          placeholder="Alt text (for screen readers)"
          value={alt ?? ""}
          onChange={(e) => onChange(url ?? "", e.target.value, heightPx)}
        />
        <input
          type="number"
          className={`${inputCls} w-24`}
          value={heightPx}
          onChange={(e) =>
            onChange(url ?? "", alt ?? "", Number(e.target.value) || 80)
          }
          title="Max height (px)"
        />
      </div>
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
