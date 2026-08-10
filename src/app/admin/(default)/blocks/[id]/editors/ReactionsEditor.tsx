"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ReactionsContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: ReactionsContent | null | undefined): ReactionsContent {
  return {
    ...(c ?? {}),
    heading: c?.heading ?? "Enjoyed this story?",
    modal_question: c?.modal_question ?? "How do you feel about this post?",
    align: c?.align ?? "center",
    padding_y_px: c?.padding_y_px ?? 40,
  };
}

export default function ReactionsEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ReactionsContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ReactionsContent>
      {...props}
      typeSlug="reactions"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ReactionsContent> }) {
  const { draft, setDraft, commit, patch } = state;

  return (
    <>
      <div className="rounded-md border border-anamaya-green/30 bg-anamaya-cream/50 p-4 text-sm leading-relaxed text-anamaya-charcoal/80">
        <p className="font-semibold text-anamaya-charcoal">
          A LIKE / LOVE / MARRY reaction for the bottom of an article.
        </p>
        <p className="mt-1">
          Drop this block at the end of a post template. It works on every
          post automatically (it records against whatever page it&rsquo;s on).
          Readers get one vote per device; you see the totals in the admin.
          This editor only controls the wording and spacing.
        </p>
      </div>

      <label className="block">
        <span className={labelCls}>Prompt above the heart</span>
        <input
          className={inputCls}
          value={draft.heading ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, heading: e.target.value }))}
          onBlur={commit}
          placeholder="Enjoyed this story?"
        />
      </label>

      <label className="block">
        <span className={labelCls}>Modal question</span>
        <input
          className={inputCls}
          value={draft.modal_question ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, modal_question: e.target.value }))}
          onBlur={commit}
          placeholder="How do you feel about this post?"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Alignment</span>
          <select
            className={inputCls}
            value={draft.align ?? "center"}
            onChange={(e) => patch({ align: e.target.value as ReactionsContent["align"] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Vertical padding (px)</span>
          <input
            type="number"
            className={inputCls}
            value={draft.padding_y_px ?? 40}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                padding_y_px: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            onBlur={commit}
          />
        </label>
      </div>
    </>
  );
}
