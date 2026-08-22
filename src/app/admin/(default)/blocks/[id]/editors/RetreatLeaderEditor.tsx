"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RetreatLeaderContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: RetreatLeaderContent | null | undefined): RetreatLeaderContent {
  return {
    responsive_mode: c?.responsive_mode ?? "fixed",
    ao_person_id: c?.ao_person_id ?? "",
    role: c?.role ?? "",
    name: c?.name ?? "",
    photo_url: c?.photo_url ?? "",
    bio_html: c?.bio_html ?? "",
    link_label: c?.link_label ?? "",
    link_href: c?.link_href ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
  };
}

export default function RetreatLeaderEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RetreatLeaderContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RetreatLeaderContent>
      {...props}
      typeSlug="retreat_leader"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<RetreatLeaderContent> }) {
  const { draft, patch, brandTokens } = state;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-anamaya-green/30 bg-anamaya-mint/10 p-4">
        <div className={labelCls}>Responsive behavior (vertical block)</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["fixed", "Fixed — always visible"],
              ["hidden", "Hidden — slide-out on mobile"],
            ] as const
          ).map(([val, lbl]) => {
            const active = (draft.responsive_mode ?? "fixed") === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => patch({ responsive_mode: val })}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
                  active
                    ? "bg-anamaya-green text-white ring-anamaya-green"
                    : "bg-white text-anamaya-charcoal/70 ring-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Live from AnamayOS (optional)
          </h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            If set and found, this overrides the manual fields below — name/photo/bio come
            straight from AnamayOS instead.
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>AnamayOS person ID</span>
          <input
            className={inputCls}
            value={draft.ao_person_id ?? ""}
            onChange={(e) => patch({ ao_person_id: e.target.value })}
            placeholder="uuid (leave blank to always use manual fields)"
          />
        </label>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Manual fields (fallback / used when no AnamayOS ID)
          </h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Role</span>
            <input
              className={inputCls}
              value={draft.role ?? ""}
              onChange={(e) => patch({ role: e.target.value })}
              placeholder="Lead Teacher"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Name</span>
            <input
              className={inputCls}
              value={draft.name ?? ""}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Angela Boltz"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Photo URL</span>
            <input
              className={inputCls}
              value={draft.photo_url ?? ""}
              onChange={(e) => patch({ photo_url: e.target.value })}
              placeholder="https://..."
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Bio (HTML)</span>
            <textarea
              className={`${inputCls} min-h-[140px] font-mono text-xs`}
              value={draft.bio_html ?? ""}
              onChange={(e) => patch({ bio_html: e.target.value })}
              placeholder="<p>...</p>"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Link label</span>
            <input
              className={inputCls}
              value={draft.link_label ?? ""}
              onChange={(e) => patch({ link_label: e.target.value })}
              placeholder="Meet Angela"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Link URL</span>
            <input
              className={inputCls}
              value={draft.link_href ?? ""}
              onChange={(e) => patch({ link_href: e.target.value })}
              placeholder="/yoga-teachers/angela-boltz"
            />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Card background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>
    </div>
  );
}
