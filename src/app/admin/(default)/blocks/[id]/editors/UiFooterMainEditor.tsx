"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { FooterColumn, UiFooterMainContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiFooterMainContent | null | undefined): UiFooterMainContent {
  return {
    bg_color: c?.bg_color ?? "",
    bg_opacity: c?.bg_opacity ?? 100,
    heading_color: c?.heading_color ?? "",
    link_color: c?.link_color ?? "",
    text_color: c?.text_color ?? "",
    columns: c?.columns ?? [],
    social_heading: c?.social_heading ?? "On social",
    social_links: c?.social_links ?? [],
    newsletter_heading: c?.newsletter_heading ?? "Receive our newsletter",
    newsletter_form_id: c?.newsletter_form_id ?? "",
    newsletter_form_name: c?.newsletter_form_name ?? "Newsletter Footer",
    newsletter_form_height: c?.newsletter_form_height ?? 380,
  };
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
  const socialLinks = draft.social_links ?? [];

  function setColumn(idx: number, next: FooterColumn) {
    const copy = columns.slice();
    copy[idx] = next;
    patch({ columns: copy });
  }
  function addColumn() {
    patch({ columns: [...columns, { heading: "New Section", items: [] }] });
  }
  function removeColumn(idx: number) {
    patch({ columns: columns.filter((_, i) => i !== idx) });
  }
  function moveColumn(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= columns.length) return;
    const copy = columns.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    patch({ columns: copy });
  }

  function setSocial(idx: number, next: { label: string; href: string }) {
    const copy = socialLinks.slice();
    copy[idx] = next;
    patch({ social_links: copy });
  }
  function addSocial() {
    patch({ social_links: [...socialLinks, { label: "Facebook", href: "https://" }] });
  }
  function removeSocial(idx: number) {
    patch({ social_links: socialLinks.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-6">
      {/* Background + colors */}
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

      {/* Link columns */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Link columns</h4>
          <button
            type="button"
            onClick={addColumn}
            className="rounded-full bg-anamaya-green px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Column
          </button>
        </header>
        {columns.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 bg-white p-4 text-center text-xs italic text-anamaya-charcoal/50">
            No columns yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {columns.map((col, idx) => (
              <li key={idx} className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={col.heading}
                    onChange={(e) =>
                      setColumn(idx, { ...col, heading: e.target.value })
                    }
                    placeholder="Section heading"
                  />
                  <button
                    type="button"
                    onClick={() => moveColumn(idx, -1)}
                    disabled={idx === 0}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(idx, 1)}
                    disabled={idx === columns.length - 1}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] hover:bg-zinc-50 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    className="rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <ColumnItemsEditor
                  items={col.items}
                  onChange={(items) => setColumn(idx, { ...col, items })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Social */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Social section</h4>
          <button
            type="button"
            onClick={addSocial}
            className="rounded-full bg-anamaya-green px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Social link
          </button>
        </header>
        <label className="mb-3 block">
          <span className={labelCls}>Section heading</span>
          <input
            className={inputCls}
            value={draft.social_heading ?? ""}
            onChange={(e) => patch({ social_heading: e.target.value })}
            placeholder="On social"
          />
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            Leave heading blank AND remove all links to hide the social column.
          </p>
        </label>
        {socialLinks.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 bg-white p-3 text-center text-xs italic text-anamaya-charcoal/50">
            No social links.
          </p>
        ) : (
          <ul className="space-y-2">
            {socialLinks.map((s, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <select
                  className={`${inputCls} w-32`}
                  value={s.label}
                  onChange={(e) => setSocial(idx, { ...s, label: e.target.value })}
                >
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Pinterest">Pinterest</option>
                  <option value="Instagram">Instagram</option>
                </select>
                <input
                  className={`${inputCls} flex-1`}
                  value={s.href}
                  onChange={(e) => setSocial(idx, { ...s, href: e.target.value })}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => removeSocial(idx)}
                  className="rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Newsletter */}
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Newsletter</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Embeds a Sereenly form. Leave the form ID blank to hide the
            newsletter column entirely.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.newsletter_heading ?? ""}
              onChange={(e) => patch({ newsletter_heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Sereenly form ID</span>
            <input
              className={inputCls}
              value={draft.newsletter_form_id ?? ""}
              onChange={(e) => patch({ newsletter_form_id: e.target.value })}
              placeholder="e.g. KStRA3wdDq5FUO6ah5Xe"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Form analytics name</span>
            <input
              className={inputCls}
              value={draft.newsletter_form_name ?? ""}
              onChange={(e) => patch({ newsletter_form_name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Initial height (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.newsletter_form_height ?? 380}
              onChange={(e) =>
                patch({ newsletter_form_height: Number(e.target.value) || 380 })
              }
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function ColumnItemsEditor({
  items,
  onChange,
}: {
  items: Array<{ label: string; href: string }>;
  onChange: (next: Array<{ label: string; href: string }>) => void;
}) {
  function update(idx: number, next: { label: string; href: string }) {
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
    <div className="space-y-1.5 border-l-2 border-anamaya-mint/60 pl-3">
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
        + Sub-item
      </button>
    </div>
  );
}
