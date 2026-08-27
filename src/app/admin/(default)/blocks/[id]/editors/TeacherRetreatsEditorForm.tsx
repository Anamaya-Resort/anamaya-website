"use client";

import type { BlockEditorState } from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { TeacherRetreatsContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

export function normalizeTeacherRetreats(
  c: TeacherRetreatsContent | null | undefined,
  defaultHeading: string,
  defaultRegisterLabel: string,
): TeacherRetreatsContent {
  return {
    ao_person_id: c?.ao_person_id ?? "",
    heading: c?.heading ?? defaultHeading,
    subheading: c?.subheading ?? "",
    register_label: c?.register_label ?? defaultRegisterLabel,
    url_pattern: c?.url_pattern ?? "/retreats/{slug}/",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    card_bg_color: c?.card_bg_color ?? "",
    card_border_color: c?.card_border_color ?? "",
    card_border_width_px: c?.card_border_width_px ?? 1,
    card_corner_radius_px: c?.card_corner_radius_px ?? 8,
    padding_y_px: c?.padding_y_px ?? 56,
    container_width_px: c?.container_width_px ?? 1200,
  };
}

/** Shared form -- identical fields for the upcoming/past variants, since
 *  they're the same content shape rendered by the same section component. */
export function TeacherRetreatsForm({ state }: { state: BlockEditorState<TeacherRetreatsContent> }) {
  const { draft, patch, brandTokens } = state;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-anamaya-green/30 bg-anamaya-mint/10 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Which teacher (automatic)</h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            On a real teacher page, this always follows THAT page&rsquo;s Teacher Profile block
            automatically -- nothing to set here. The field below only affects this shared
            block&rsquo;s own preview (e.g. in the template editor), so it always shows real
            sample cards instead of an empty box.
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>AnamayOS person ID (preview only)</span>
          <input
            className={inputCls}
            value={draft.ao_person_id ?? ""}
            onChange={(e) => patch({ ao_person_id: e.target.value })}
            placeholder="uuid"
          />
        </label>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Button label</span>
            <input
              className={inputCls}
              value={draft.register_label ?? ""}
              onChange={(e) => patch({ register_label: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Sub-text</span>
            <input
              className={inputCls}
              value={draft.subheading ?? ""}
              onChange={(e) => patch({ subheading: e.target.value })}
              placeholder="(optional)"
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
            <span className={labelCls}>Background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Heading color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
        </div>
      </section>
    </div>
  );
}
