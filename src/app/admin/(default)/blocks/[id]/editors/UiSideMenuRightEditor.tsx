"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import { OverlayFields } from "@/components/admin/blocks/OverlayFields";
import type { UiSideMenuRightContent } from "@/types/blocks";

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
    use_nav_data: c?.use_nav_data ?? true,
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
      <label className="block sm:col-span-2">
        <span className="flex items-center gap-2 text-xs font-medium text-anamaya-charcoal/80">
          <input
            type="checkbox"
            checked={draft.use_nav_data !== false}
            onChange={(e) => patch({ use_nav_data: e.target.checked })}
          />
          Source nav items from <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">data/nav.ts</code>
        </span>
      </label>
    </div>
  );
}
