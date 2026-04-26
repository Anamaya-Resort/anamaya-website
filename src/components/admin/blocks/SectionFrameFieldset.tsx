"use client";

import MediaFieldset from "./MediaFieldset";
import type { SectionFrame } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

/**
 * Section-frame controls: inner content max-width + an optional decorative
 * overlay anchored to a corner. Drop into any editor whose content extends
 * SectionFrame to give it the modern editorial layout: full-bleed bg,
 * centered narrow content column, decoration that bleeds off the edge.
 */
export default function SectionFrameFieldset({
  frame,
  onChange,
  defaultWidth,
  onCommit,
}: {
  frame: SectionFrame;
  onChange: (update: Partial<SectionFrame>) => void;
  /** The block-type's content-width default, shown as placeholder. */
  defaultWidth?: number;
  onCommit?: () => void;
}) {
  const hasDecoration = !!frame.decoration_url;

  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <h4 className="mb-3 text-[15px] font-semibold uppercase tracking-wider text-anamaya-charcoal">
        Section frame
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Content max-width (px)</span>
          <input
            type="number"
            className={inputCls}
            value={frame.content_width_px ?? ""}
            placeholder={defaultWidth ? String(defaultWidth) : ""}
            onChange={(e) =>
              onChange({
                content_width_px: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            onBlur={onCommit}
          />
        </label>
      </div>

      <div className="mt-4">
        <header className="mb-2 flex items-center justify-between">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Decoration overlay (optional)
          </h5>
        </header>

        <MediaFieldset
          label="Decoration image"
          url={frame.decoration_url ?? ""}
          onUrlChange={(url) => onChange({ decoration_url: url || undefined })}
          onCommit={onCommit}
          alt={frame.decoration_alt ?? ""}
          onAltChange={(v) => onChange({ decoration_alt: v })}
          uploadKind="backgrounds"
          uploadMaxWidth={1200}
          showAlt
        />

        {hasDecoration && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Position</span>
              <select
                className={inputCls}
                value={frame.decoration_position ?? "top-right"}
                onChange={(e) =>
                  onChange({
                    decoration_position: e.target
                      .value as SectionFrame["decoration_position"],
                  })
                }
                onBlur={onCommit}
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
                <option value="left-center">Left center</option>
                <option value="right-center">Right center</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Size (px)</span>
              <input
                type="number"
                className={inputCls}
                value={frame.decoration_size_px ?? 240}
                onChange={(e) =>
                  onChange({ decoration_size_px: Number(e.target.value) || 240 })
                }
                onBlur={onCommit}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Offset X (px) — negative bleeds off</span>
              <input
                type="number"
                className={inputCls}
                value={frame.decoration_offset_x_px ?? 0}
                onChange={(e) =>
                  onChange({ decoration_offset_x_px: Number(e.target.value) || 0 })
                }
                onBlur={onCommit}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Offset Y (px) — negative bleeds off</span>
              <input
                type="number"
                className={inputCls}
                value={frame.decoration_offset_y_px ?? 0}
                onChange={(e) =>
                  onChange({ decoration_offset_y_px: Number(e.target.value) || 0 })
                }
                onBlur={onCommit}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Opacity (0-100)</span>
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls}
                value={frame.decoration_opacity ?? 100}
                onChange={(e) =>
                  onChange({ decoration_opacity: Number(e.target.value) })
                }
                onBlur={onCommit}
              />
            </label>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
                <input
                  type="checkbox"
                  checked={!!frame.decoration_flip_x}
                  onChange={(e) => onChange({ decoration_flip_x: e.target.checked })}
                />
                Flip X
              </label>
              <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
                <input
                  type="checkbox"
                  checked={!!frame.decoration_flip_y}
                  onChange={(e) => onChange({ decoration_flip_y: e.target.checked })}
                />
                Flip Y
              </label>
              <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
                <input
                  type="checkbox"
                  checked={!!frame.decoration_show_mobile}
                  onChange={(e) =>
                    onChange({ decoration_show_mobile: e.target.checked })
                  }
                />
                Show on mobile
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
