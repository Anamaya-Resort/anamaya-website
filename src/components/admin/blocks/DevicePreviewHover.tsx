"use client";

import { useState } from "react";

/**
 * Hover-to-preview device frames for the block editor.
 *
 * Hovering the button instantly pops up live previews of the block at a
 * few common phone / tablet widths — no click needed. Each frame is a
 * real <iframe> sized to the device's CSS width, so the block's media
 * queries and fluid sizing evaluate against that exact viewport (just
 * like a real phone), then the frame is visually scaled down to fit the
 * popover. This is real device emulation, not a shrunk screenshot.
 *
 * Note: the iframe shows the LAST SAVED version of the block (it loads
 * by slug from the DB), so save first to see edits reflected here. The
 * full-width inline preview above already reflects unsaved edits.
 */

type Device = { id: string; label: string; w: number; h: number };

const DEVICES: Device[] = [
  { id: "se", label: "iPhone SE", w: 375, h: 667 },
  { id: "max", label: "iPhone Pro Max", w: 430, h: 740 },
  { id: "ipad", label: "iPad", w: 768, h: 800 },
];

// On-screen width of each frame in the popover. The iframe renders at the
// device's true width and is scaled by (DISPLAY_W / device.w) so the
// internal viewport — and therefore every media query — stays accurate.
const DISPLAY_W = 230;

export default function DevicePreviewHover({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  if (!slug) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal transition-colors hover:bg-zinc-50"
      >
        📱 Phone / tablet preview
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 text-[11px] font-medium text-zinc-500">
            Live at each width · showing last saved version
          </div>
          <div className="flex gap-4">
            {DEVICES.map((d) => (
              <DeviceFrame key={d.id} slug={slug} device={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceFrame({ slug, device }: { slug: string; device: Device }) {
  const scale = DISPLAY_W / device.w;
  const displayH = Math.round(device.h * scale);
  return (
    <div className="shrink-0">
      <div className="mb-1 text-center text-[11px] font-semibold text-anamaya-charcoal">
        {device.label}
        <span className="font-normal text-zinc-400"> · {device.w}px</span>
      </div>
      <div
        className="overflow-hidden rounded-[14px] border-2 border-zinc-800 bg-white"
        style={{ width: DISPLAY_W, height: displayH }}
      >
        <iframe
          src={`/block-preview/${slug}`}
          title={`${device.label} preview`}
          width={device.w}
          height={device.h}
          style={{
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
