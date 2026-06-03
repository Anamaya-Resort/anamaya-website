"use client";

import { useState } from "react";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";

/**
 * One labelled image slot for the Social & Icons tab: shows the current
 * image, an Upload/Replace button (reuses the block-image uploader →
 * Supabase Storage), a Remove link, and a hidden input so the surrounding
 * server-action form persists the resulting URL. No raw-URL text input,
 * per house rule.
 */
export default function ImageSlot({
  name,
  label,
  recommended,
  note,
  value,
}: {
  name: string;
  label: string;
  recommended: string;
  note?: string;
  value?: string;
}) {
  const [url, setUrl] = useState(value ?? "");

  return (
    <div className="flex items-start gap-3 border-b border-[#dcdcde] py-3 last:border-b-0">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#dcdcde] bg-[#f6f7f7]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-[#a7aaad]">none</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[#1d2327]">
          {label} <span className="font-normal text-[#50575e]">· {recommended}</span>
        </div>
        {note && <p className="mt-0.5 text-[12px] text-[#50575e]">{note}</p>}
        <div className="mt-1.5 flex items-center gap-3">
          <ImageUploadButton value={url} kind="site" maxWidth={1200} onUploaded={setUrl} />
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-[12px] text-[#b32d2e] hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
