"use client";

import { useRef, useState } from "react";
import { uploadBlockImage } from "@/app/admin/(default)/blocks/actions";

/**
 * Small reusable "Upload image" button — pairs with a URL text input in
 * every block editor so users can either paste a URL or upload from disk.
 * Calls `onUploaded` with the final Supabase Storage URL when upload
 * succeeds. Errors render inline next to the button.
 */
export default function ImageUploadButton({
  value,
  onUploaded,
  maxWidth = 2000,
  kind = "blocks",
  label,
}: {
  value?: string;
  onUploaded: (url: string) => void;
  /** Downscale cap in px (width). */
  maxWidth?: number;
  /** Storage sub-folder, e.g. "hero-posters" or "overlays". */
  kind?: string;
  /** Override button label. */
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("maxWidth", String(maxWidth));
      fd.append("kind", kind);
      const { url } = await uploadBlockImage(fd);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  const defaultLabel = uploading ? "Uploading…" : value ? "Replace" : "Upload";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-50"
      >
        {label ?? defaultLabel}
      </button>
      {error && (
        <span className="text-xs text-red-600" title={error}>
          Upload failed
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pick(f);
        }}
      />
    </div>
  );
}
