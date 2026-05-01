"use client";

import type { OverlayAnchor, OverlayTrigger } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

const ANCHORS: OverlayAnchor[] = ["top", "right", "bottom", "left", "fullscreen"];
const TRIGGERS: OverlayTrigger[] = ["always", "on-menu", "on-scroll"];

/**
 * Three form fields shared by every overlay block editor (ui_top,
 * ui_side_menu_right, ui_agent): the anchor edge, the trigger
 * condition, and the z-index. All three live in blocks.content as
 * the OverlayMixin shape, so the same widget works against any
 * overlay block's draft.
 */
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
