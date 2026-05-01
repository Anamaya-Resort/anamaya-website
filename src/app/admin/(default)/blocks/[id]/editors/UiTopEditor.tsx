"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { OverlayAnchor, OverlayTrigger, UiTopContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiTopContent | null | undefined): UiTopContent {
  return {
    overlay_z: c?.overlay_z ?? 40,
    overlay_anchor: c?.overlay_anchor ?? "top",
    overlay_trigger: c?.overlay_trigger ?? "always",
    logo_dark_url: c?.logo_dark_url ?? "/anamaya-logo.webp",
    logo_light_url: c?.logo_light_url ?? "/anamaya-logo-white.webp",
    logo_width: c?.logo_width ?? 300,
    logo_height: c?.logo_height ?? 136,
    cta_label: c?.cta_label ?? "CALENDAR",
    cta_href: c?.cta_href ?? "/rg-calendar/",
    menu_label: c?.menu_label ?? "MENU",
    lightmode_when_over_video: c?.lightmode_when_over_video ?? true,
  };
}

export default function UiTopEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: UiTopContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<UiTopContent>
      {...props}
      typeSlug="ui_top"
      isOverlay
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<UiTopContent> }) {
  const { draft, patch } = state;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OverlayFields draft={draft} patch={patch} />

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
      <label className="block">
        <span className={labelCls}>Menu button label</span>
        <input
          className={inputCls}
          value={draft.menu_label ?? ""}
          onChange={(e) => patch({ menu_label: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Logo (dark mode) URL</span>
        <input
          className={inputCls}
          value={draft.logo_dark_url ?? ""}
          onChange={(e) => patch({ logo_dark_url: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Logo (light mode) URL</span>
        <input
          className={inputCls}
          value={draft.logo_light_url ?? ""}
          onChange={(e) => patch({ logo_light_url: e.target.value })}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="flex items-center gap-2 text-xs font-medium text-anamaya-charcoal/80">
          <input
            type="checkbox"
            checked={draft.lightmode_when_over_video !== false}
            onChange={(e) =>
              patch({ lightmode_when_over_video: e.target.checked })
            }
          />
          Switch to light-on-dark styling when sitting over a hero video
        </span>
      </label>
    </div>
  );
}

const ANCHORS: OverlayAnchor[] = ["top", "right", "bottom", "left", "fullscreen"];
const TRIGGERS: OverlayTrigger[] = ["always", "on-menu", "on-scroll"];

export function OverlayFields({
  draft,
  patch,
}: {
  draft: { overlay_z?: number; overlay_anchor?: OverlayAnchor; overlay_trigger?: OverlayTrigger };
  patch: (u: Partial<{ overlay_z: number; overlay_anchor: OverlayAnchor; overlay_trigger: OverlayTrigger }>) => void;
}) {
  return (
    <>
      <label className="block">
        <span className={labelCls}>Overlay anchor</span>
        <select
          className={inputCls}
          value={draft.overlay_anchor ?? "top"}
          onChange={(e) => patch({ overlay_anchor: e.target.value as OverlayAnchor })}
        >
          {ANCHORS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>Overlay trigger</span>
        <select
          className={inputCls}
          value={draft.overlay_trigger ?? "always"}
          onChange={(e) => patch({ overlay_trigger: e.target.value as OverlayTrigger })}
        >
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelCls}>z-index</span>
        <input
          type="number"
          className={inputCls}
          value={draft.overlay_z ?? 40}
          onChange={(e) => patch({ overlay_z: Number(e.target.value) || 0 })}
        />
      </label>
    </>
  );
}
