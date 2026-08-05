"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { FaqContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

// The block's historical content cap; used when Max Content hasn't been set.
const FAQ_DEFAULT_MAX_CONTENT_PX = 820;

function normalize(c: FaqContent | null | undefined): FaqContent {
  return {
    ...normalizeLayoutWidths(c, FAQ_DEFAULT_MAX_CONTENT_PX),
    ...(c ?? {}),
    heading: c?.heading ?? "Frequently Asked Questions",
    subheading: c?.subheading ?? "",
    more_label: c?.more_label ?? "More questions",
    heading_color: c?.heading_color ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 64,
  };
}

export default function FaqEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: FaqContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<FaqContent>
      {...props}
      typeSlug="faq"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<FaqContent> }) {
  const { draft, setDraft, commit, patch, brandTokens } = state;

  return (
    <>
      {/* This block only holds the section's LOOK. The actual questions and
          answers are specific to each page/post and are generated + edited on
          that page, not here. Make that unmistakable in the editor. */}
      <div className="rounded-md border border-anamaya-green/30 bg-anamaya-cream/50 p-4 text-sm leading-relaxed text-anamaya-charcoal/80">
        <p className="font-semibold text-anamaya-charcoal">
          This block controls the FAQ section&rsquo;s appearance only.
        </p>
        <p className="mt-1">
          The questions and answers are different on every page. On each page or
          post, the AI drafts FAQs from that page&rsquo;s content, you review
          and edit them, and the three you mark as Featured stay open while the
          rest sit in a collapsible panel. The preview above shows sample
          questions so you can shape the design.
        </p>
      </div>

      <LayoutWidthsFieldset
        values={draft}
        onPatch={patch}
        maxContentDefault={FAQ_DEFAULT_MAX_CONTENT_PX}
      />

      <label className="block">
        <span className={labelCls}>Section heading</span>
        <input
          className={inputCls}
          value={draft.heading ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, heading: e.target.value }))}
          onBlur={commit}
          placeholder="Frequently Asked Questions"
        />
      </label>

      <label className="block">
        <span className={labelCls}>Sub-heading (optional)</span>
        <input
          className={inputCls}
          value={draft.subheading ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, subheading: e.target.value }))}
          onBlur={commit}
          placeholder="Short line under the heading"
        />
      </label>

      <label className="block">
        <span className={labelCls}>&ldquo;More questions&rdquo; label</span>
        <input
          className={inputCls}
          value={draft.more_label ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, more_label: e.target.value }))}
          onBlur={commit}
          placeholder="More questions"
        />
        <span className="mt-1 block text-xs italic text-anamaya-charcoal/50">
          Text on the collapsible panel that holds the non-featured questions.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
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
          <span className={labelCls}>Background color</span>
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

      <label className="block w-40">
        <span className={labelCls}>Padding Y (px)</span>
        <input
          type="number"
          min={0}
          max={400}
          className={inputCls}
          value={draft.padding_y_px ?? 64}
          onChange={(e) =>
            setDraft((d) => ({ ...d, padding_y_px: Number(e.target.value) || 0 }))
          }
          onBlur={commit}
        />
      </label>
    </>
  );
}
