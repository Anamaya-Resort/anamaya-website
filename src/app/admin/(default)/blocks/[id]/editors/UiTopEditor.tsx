"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import { OverlayFields } from "@/components/admin/blocks/OverlayFields";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import type { OrgBranding } from "@/config/brand-tokens";
import type { UiTopContent } from "@/types/blocks";

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
    <div className="space-y-6">
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

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Logo</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Two variants: a dark-on-light logo for the normal header, and a
            light-on-dark logo shown while sitting over a hero video.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <LogoField
            label="Dark mode logo (default)"
            url={draft.logo_dark_url}
            bgClass="bg-white"
            onChange={(url) => patch({ logo_dark_url: url })}
          />
          <LogoField
            label="Light mode logo (over video)"
            url={draft.logo_light_url}
            bgClass="bg-anamaya-charcoal"
            onChange={(url) => patch({ logo_light_url: url })}
          />
          <label className="block">
            <span className={labelCls}>Native width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.logo_width ?? 300}
              onChange={(e) => patch({ logo_width: Number(e.target.value) || 300 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Native height (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.logo_height ?? 136}
              onChange={(e) => patch({ logo_height: Number(e.target.value) || 136 })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function LogoField({
  label,
  url,
  bgClass,
  onChange,
}: {
  label: string;
  url: string | undefined;
  bgClass: string;
  onChange: (url: string) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className={`flex items-center gap-3 rounded-md border border-zinc-200 p-2 ${bgClass}`}>
        <div className="flex h-12 w-32 items-center justify-center overflow-hidden rounded">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="max-h-12 max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] italic opacity-60">no image</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <ImageUploadButton
            value={url}
            onUploaded={onChange}
            kind="ui-overlays"
            maxWidth={1200}
          />
          {url && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-full border border-red-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
