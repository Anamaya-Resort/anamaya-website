"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RetreatTitleContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: RetreatTitleContent | null | undefined): RetreatTitleContent {
  return {
    retreat_id: c?.retreat_id ?? "",
    manual_title: c?.manual_title ?? "",
    padding_y_px: c?.padding_y_px ?? 32,
  };
}

export default function RetreatTitleEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RetreatTitleContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RetreatTitleContent>
      {...props}
      typeSlug="retreat_title"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<RetreatTitleContent> }) {
  const { draft, patch } = state;
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-anamaya-green/30 bg-anamaya-mint/10 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Status line (automatic, not editable)
          </h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            Computed live from this retreat&rsquo;s AnamayOS dates and availability every time the
            page loads: &ldquo;Retreat Has Ended&rdquo;, &ldquo;Currently in Progress&rdquo;,
            &ldquo;Retreat Is Full&rdquo;, or nothing at all when it&rsquo;s upcoming and bookable.
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>AnamayOS retreat ID</span>
          <input
            className={inputCls}
            value={draft.retreat_id ?? ""}
            onChange={(e) => patch({ retreat_id: e.target.value })}
            placeholder="uuid"
          />
        </label>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Title</h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            When the AnamayOS ID above resolves, its own retreat name is used instead of this
            field automatically. This is the fallback (and what shows with no ID set).
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>Title (fallback)</span>
          <input
            className={inputCls}
            value={draft.manual_title ?? ""}
            onChange={(e) => patch({ manual_title: e.target.value })}
            placeholder="Retreat Name"
          />
        </label>
      </section>
    </div>
  );
}
