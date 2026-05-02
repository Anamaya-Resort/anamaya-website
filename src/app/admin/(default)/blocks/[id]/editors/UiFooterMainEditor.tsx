"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import { coerceFooterMainContent } from "@/lib/footer-content";
import type {
  FooterColumn,
  FooterColumnGroup,
  FooterLinkItem,
  UiFooterMainContent,
} from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiFooterMainContent | null | undefined): UiFooterMainContent {
  // coerceFooterMainContent migrates legacy shape (flat columns +
  // social_* + newsletter_* fields) into the current nested shape so a
  // pre-0031 row doesn't crash the editor on first open.
  return coerceFooterMainContent(c);
}

export default function UiFooterMainEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: UiFooterMainContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<UiFooterMainContent>
      {...props}
      typeSlug="ui_footer_main"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<UiFooterMainContent> }) {
  const { draft, patch, brandTokens } = state;
  const columns = draft.columns ?? [];

  function setCol(idx: number, next: FooterColumn) {
    const copy = columns.slice();
    copy[idx] = next;
    patch({ columns: copy });
  }
  function addCol() {
    patch({ columns: [...columns, { groups: [] }] });
  }
  function removeCol(idx: number) {
    patch({ columns: columns.filter((_, i) => i !== idx) });
  }
  function moveCol(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= columns.length) return;
    const copy = columns.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    patch({ columns: copy });
  }

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
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
              Auto = anamaya-charcoal (#444444).
            </p>
          </div>
          <label className="block">
            <span className={labelCls}>Opacity (0–100)</span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.bg_opacity ?? 100}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({ bg_opacity: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 100 });
              }}
            />
          </label>
          <div>
            <span className={labelCls}>Heading color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Link color</span>
            <BrandColorSelect
              value={draft.link_color}
              onChange={(v) => patch({ link_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>

      {/* Columns */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-anamaya-charcoal">Columns</h4>
            <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
              The footer renders one column per entry below. Inside each
              column, groups stack top-to-bottom in the order shown.
            </p>
          </div>
          <button
            type="button"
            onClick={addCol}
            className="rounded-full bg-anamaya-green px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Column
          </button>
        </header>

        {columns.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 bg-white p-4 text-center text-xs italic text-anamaya-charcoal/50">
            No columns yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {columns.map((col, idx) => (
              <li key={idx} className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
                    Column {idx + 1}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => moveCol(idx, -1)}
                    disabled={idx === 0}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCol(idx, 1)}
                    disabled={idx === columns.length - 1}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCol(idx)}
                    className="rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                  >
                    Remove column
                  </button>
                </div>
                <ColumnGroupsEditor
                  groups={col.groups ?? []}
                  onChange={(groups) => setCol(idx, { groups })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ColumnGroupsEditor({
  groups,
  onChange,
}: {
  groups: FooterColumnGroup[];
  onChange: (next: FooterColumnGroup[]) => void;
}) {
  function update(idx: number, next: FooterColumnGroup) {
    const copy = groups.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= groups.length) return;
    const copy = groups.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(groups.filter((_, i) => i !== idx));
  }
  function addLinks() {
    onChange([...groups, { kind: "links", heading: "New section", items: [] }]);
  }
  function addSocial() {
    onChange([...groups, { kind: "social", heading: "On social", links: [] }]);
  }
  function addNewsletter() {
    onChange([
      ...groups,
      {
        kind: "newsletter",
        heading: "Receive our newsletter",
        form_id: "",
        form_name: "Newsletter Footer",
        form_height: 380,
      },
    ]);
  }

  return (
    <div className="border-l-2 border-anamaya-mint/60 pl-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          Groups
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={addLinks}
          className="rounded-full border border-anamaya-charcoal/30 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100"
        >
          + Links
        </button>
        <button
          type="button"
          onClick={addSocial}
          className="rounded-full border border-anamaya-charcoal/30 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100"
        >
          + Social
        </button>
        <button
          type="button"
          onClick={addNewsletter}
          className="rounded-full border border-anamaya-charcoal/30 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-100"
        >
          + Newsletter
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-[11px] italic text-anamaya-charcoal/50">
          No groups in this column.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g, idx) => (
            <li
              key={idx}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
            >
              <div className="mb-2 flex items-center gap-1">
                <span className="rounded bg-anamaya-charcoal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                  {g.kind}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === groups.length - 1}
                  className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded border border-red-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                >
                  ×
                </button>
              </div>
              <GroupEditor group={g} onChange={(next) => update(idx, next)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupEditor({
  group,
  onChange,
}: {
  group: FooterColumnGroup;
  onChange: (next: FooterColumnGroup) => void;
}) {
  if (group.kind === "links") {
    return (
      <div className="space-y-2">
        <input
          className={inputCls}
          value={group.heading}
          onChange={(e) => onChange({ ...group, heading: e.target.value })}
          placeholder="Section heading"
        />
        <LinkItemsEditor
          items={group.items}
          onChange={(items) => onChange({ ...group, items })}
        />
      </div>
    );
  }
  if (group.kind === "social") {
    return (
      <div className="space-y-2">
        <input
          className={inputCls}
          value={group.heading}
          onChange={(e) => onChange({ ...group, heading: e.target.value })}
          placeholder="Section heading"
        />
        <SocialLinksEditor
          links={group.links}
          onChange={(links) => onChange({ ...group, links })}
        />
      </div>
    );
  }
  // newsletter
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className={labelCls}>Heading</span>
        <input
          className={inputCls}
          value={group.heading}
          onChange={(e) => onChange({ ...group, heading: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Sereenly form ID</span>
        <input
          className={inputCls}
          value={group.form_id}
          onChange={(e) => onChange({ ...group, form_id: e.target.value })}
          placeholder="e.g. KStRA3wdDq5FUO6ah5Xe"
        />
      </label>
      <label className="block">
        <span className={labelCls}>Form analytics name</span>
        <input
          className={inputCls}
          value={group.form_name ?? ""}
          onChange={(e) => onChange({ ...group, form_name: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Initial height (px)</span>
        <input
          type="number"
          className={inputCls}
          value={group.form_height ?? 380}
          onChange={(e) =>
            onChange({ ...group, form_height: Number(e.target.value) || 380 })
          }
        />
      </label>
    </div>
  );
}

function LinkItemsEditor({
  items,
  onChange,
}: {
  items: FooterLinkItem[];
  onChange: (next: FooterLinkItem[]) => void;
}) {
  function update(idx: number, next: FooterLinkItem) {
    const copy = items.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= items.length) return;
    const copy = items.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function append() {
    onChange([...items, { label: "New link", href: "/" }]);
  }
  return (
    <div className="space-y-1">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            className={`${inputCls} flex-1 text-xs`}
            value={it.label}
            onChange={(e) => update(idx, { ...it, label: e.target.value })}
            placeholder="Label"
          />
          <input
            className={`${inputCls} flex-1 text-xs`}
            value={it.href}
            onChange={(e) => update(idx, { ...it, href: e.target.value })}
            placeholder="/path/"
          />
          <button
            type="button"
            onClick={() => move(idx, -1)}
            disabled={idx === 0}
            className="rounded border border-zinc-300 bg-white px-1.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move(idx, 1)}
            disabled={idx === items.length - 1}
            className="rounded border border-zinc-300 bg-white px-1.5 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="rounded border border-red-300 bg-white px-1.5 text-[10px] font-semibold uppercase text-red-600 hover:bg-red-50"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={append}
        className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-green hover:text-anamaya-green-dark"
      >
        + Link
      </button>
    </div>
  );
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: FooterLinkItem[];
  onChange: (next: FooterLinkItem[]) => void;
}) {
  function update(idx: number, next: FooterLinkItem) {
    const copy = links.slice();
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(links.filter((_, i) => i !== idx));
  }
  function append() {
    onChange([...links, { label: "Facebook", href: "https://" }]);
  }
  return (
    <div className="space-y-1">
      {links.map((s, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <select
            className={`${inputCls} w-32 text-xs`}
            value={s.label}
            onChange={(e) => update(idx, { ...s, label: e.target.value })}
          >
            <option value="Facebook">Facebook</option>
            <option value="Twitter">Twitter</option>
            <option value="YouTube">YouTube</option>
            <option value="Pinterest">Pinterest</option>
            <option value="Instagram">Instagram</option>
          </select>
          <input
            className={`${inputCls} flex-1 text-xs`}
            value={s.href}
            onChange={(e) => update(idx, { ...s, href: e.target.value })}
            placeholder="https://..."
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="rounded border border-red-300 bg-white px-1.5 text-[10px] font-semibold uppercase text-red-600 hover:bg-red-50"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={append}
        className="text-[10px] font-semibold uppercase tracking-wider text-anamaya-green hover:text-anamaya-green-dark"
      >
        + Social link
      </button>
    </div>
  );
}
