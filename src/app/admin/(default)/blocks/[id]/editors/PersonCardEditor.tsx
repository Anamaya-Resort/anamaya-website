"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import RTE from "@/components/admin/rte/RichTextEditor";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { PersonCardContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: PersonCardContent | null | undefined): PersonCardContent {
  return {
    ...(c ?? { name: "" }),
    ...normalizeLayoutWidths(c, c?.content_width_px ?? 1200),
    name: c?.name ?? "",
    layout: c?.layout ?? "side-by-side",
    photo_width_pct: c?.photo_width_pct ?? 30,
    padding_y_px: c?.padding_y_px ?? 64,
    content_width_px: c?.content_width_px ?? 1200,
  };
}

export default function PersonCardEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: PersonCardContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<PersonCardContent>
      {...props}
      typeSlug="person_card"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<PersonCardContent> }) {
  const { draft, patch } = state;

  return (
    <div className="space-y-4">
      {/* Layout widths — first, right under the live preview. */}
      <LayoutWidthsFieldset
        values={draft}
        onPatch={patch}
        maxContentDefault={draft.content_width_px ?? 1200}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            className={inputCls}
            value={draft.name ?? ""}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        <Field label="Credentials (single line)">
          <input
            className={inputCls}
            value={draft.credentials ?? ""}
            onChange={(e) => patch({ credentials: e.target.value })}
            placeholder="RYT-500, Founder of …"
          />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls}>Photo</span>
            <ImageUploadButton
              value={draft.photo_url}
              onUploaded={(url) => patch({ photo_url: url })}
              kind="person-cards"
              maxWidth={1200}
            />
          </div>
          {draft.photo_url && (
            <img src={draft.photo_url} alt="" className="h-32 w-32 rounded-lg object-cover" />
          )}
        </div>

        <div className="sm:col-span-2">
          <Field label="Bio (rich text)">
            <RTE
              value={draft.html ?? ""}
              onChange={(html) => patch({ html })}
              placeholder="Their story, training, focus…"
            />
          </Field>
        </div>

        <Field label="Layout">
          <select
            className={inputCls}
            value={draft.layout ?? "side-by-side"}
            onChange={(e) => patch({ layout: e.target.value as PersonCardContent["layout"] })}
          >
            <option value="side-by-side">Side-by-side (photo left, text right)</option>
            <option value="stacked">Stacked (photo above, centered)</option>
          </select>
        </Field>
        {draft.layout === "side-by-side" && (
          <Field label="Photo column width %">
            <input
              type="number"
              min={20}
              max={50}
              className={inputCls}
              value={draft.photo_width_pct ?? 30}
              onChange={(e) => patch({ photo_width_pct: Number(e.target.value) })}
            />
          </Field>
        )}

        <Field label="Link label">
          <input
            className={inputCls}
            value={draft.link_label ?? ""}
            onChange={(e) => patch({ link_label: e.target.value })}
            placeholder="Read full bio"
          />
        </Field>
        <Field label="Link href">
          <input
            className={inputCls}
            value={draft.link_href ?? ""}
            onChange={(e) => patch({ link_href: e.target.value })}
          />
        </Field>

        <Field label="Background color">
          <input
            className={inputCls}
            value={draft.bg_color ?? ""}
            onChange={(e) => patch({ bg_color: e.target.value })}
          />
        </Field>
        <Field label="Vertical padding (px)">
          <input
            type="number"
            className={inputCls}
            value={draft.padding_y_px ?? 64}
            onChange={(e) => patch({ padding_y_px: Number(e.target.value) })}
          />
        </Field>

        <div className="sm:col-span-2">
          <SectionFrameFieldset
            frame={draft}
            onChange={(u) => patch(u)}
            defaultWidth={1200}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
