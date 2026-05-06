"use client";

import { Pencil, Check, X } from "lucide-react";
import { useState } from "react";

/**
 * Inline-editable permalink for the Publish card. Renders as a code
 * label + pencil icon by default; clicking the pencil swaps in a text
 * input plus check / cancel buttons. The current value is always
 * mirrored into a hidden input (name=url_path) so a normal form
 * submit picks it up.
 *
 * Cancel restores the original (defaultValue) — useful when an author
 * starts editing then changes their mind.
 */
export default function EditablePermalink({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);

  function normalize(v: string) {
    const trimmed = v.trim();
    if (!trimmed) return "/";
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  return (
    <div className="border-t border-[#dcdcde] pt-2 text-[12px] text-[#50575e]">
      <input type="hidden" name="url_path" value={value} />
      {editing ? (
        <div className="flex items-center gap-1">
          <span className="shrink-0">Permalink:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setValue((v) => normalize(v))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setValue((v) => normalize(v));
                setEditing(false);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setValue(defaultValue);
                setEditing(false);
              }
            }}
            aria-label="Permalink path"
            className="h-6 min-w-0 flex-1 rounded-sm border border-[#8c8f94] bg-white px-1 font-mono text-[12px] text-[#1d2327]"
            autoFocus
          />
          <button
            type="button"
            title="Confirm"
            onClick={() => {
              setValue((v) => normalize(v));
              setEditing(false);
            }}
            className="rounded p-0.5 text-[#2271b1] hover:bg-[#f0f0f1]"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            title="Cancel"
            onClick={() => {
              setValue(defaultValue);
              setEditing(false);
            }}
            className="rounded p-0.5 text-[#b32d2e] hover:bg-[#f0f0f1]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="shrink-0">Permalink:</span>
          <code className="min-w-0 flex-1 truncate text-[#2271b1]" title={value}>
            {value}
          </code>
          <button
            type="button"
            title="Edit permalink"
            onClick={() => setEditing(true)}
            className="rounded p-0.5 text-[#50575e] hover:bg-[#f0f0f1] hover:text-[#1d2327]"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
