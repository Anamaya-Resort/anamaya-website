"use client";

import ImageUploadButton from "./ImageUploadButton";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

/**
 * URL + Upload + Alt-text bundle for any image field in a block editor.
 * Pass `showAlt={false}` for purely decorative / background images where
 * alt text doesn't apply (e.g. CSS background-image).
 */
export default function MediaFieldset({
  label = "Image",
  url,
  onUrlChange,
  onCommit,
  alt,
  onAltChange,
  uploadKind,
  uploadMaxWidth = 2000,
  placeholder = "Paste a URL or use Upload →",
  showAlt = true,
}: {
  label?: string;
  url: string | undefined;
  onUrlChange: (url: string) => void;
  /** Called on blur — commits draft → preview in the shared chrome. */
  onCommit?: () => void;
  alt?: string;
  onAltChange?: (alt: string) => void;
  uploadKind: string;
  uploadMaxWidth?: number;
  placeholder?: string;
  showAlt?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={labelCls}>{label}</span>
          <ImageUploadButton
            value={url}
            onUploaded={(u) => onUrlChange(u)}
            kind={uploadKind}
            maxWidth={uploadMaxWidth}
          />
        </div>
        <input
          className={inputCls}
          value={url ?? ""}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onCommit}
          placeholder={placeholder}
        />
      </div>
      {showAlt && onAltChange && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls}>Alt text</span>
            <span className="text-[10px] text-anamaya-charcoal/50">
              Leave blank if decorative
            </span>
          </div>
          <input
            className={inputCls}
            value={alt ?? ""}
            onChange={(e) => onAltChange(e.target.value)}
            onBlur={onCommit}
            placeholder="Describe the image for screen readers and SEO"
          />
        </div>
      )}
    </div>
  );
}
