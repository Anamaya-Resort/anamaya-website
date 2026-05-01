"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import { OverlayFields } from "@/components/admin/blocks/OverlayFields";
import type { UiAgentContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiAgentContent | null | undefined): UiAgentContent {
  return {
    overlay_z: c?.overlay_z ?? 40,
    overlay_anchor: c?.overlay_anchor ?? "bottom",
    overlay_trigger: c?.overlay_trigger ?? "always",
    property_id_scope: c?.property_id_scope ?? null,
  };
}

export default function UiAgentEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: UiAgentContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<UiAgentContent>
      {...props}
      typeSlug="ui_agent"
      isOverlay
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<UiAgentContent> }) {
  const { draft, patch } = state;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OverlayFields draft={draft} patch={patch} />

      <label className="block sm:col-span-2">
        <span className={labelCls}>Property scope (UUID, optional)</span>
        <input
          className={inputCls}
          value={draft.property_id_scope ?? ""}
          onChange={(e) =>
            patch({ property_id_scope: e.target.value.trim() || null })
          }
          placeholder="Leave blank for whole-site agent"
        />
        <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
          When set, /api/ai/ask retrieval is scoped to this AnamayOS sub-property.
        </p>
      </label>

      <p className="sm:col-span-2 rounded-md bg-anamaya-cream/60 p-3 text-[11px] text-anamaya-charcoal/70">
        Visibility on the live site is controlled by{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono">/api/ai/agent-config</code>{" "}
        (per-tenant enable/disable). The block&rsquo;s overlay anchor is advisory —
        the bubble&rsquo;s position is currently fixed to the bottom-right corner
        in the agent&rsquo;s own CSS. To move it, edit{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono">VisitorAgent.tsx</code>.
      </p>
    </div>
  );
}
