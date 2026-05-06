"use client";

import { useEffect, useState } from "react";

/**
 * Branded prompt modal — replaces window.prompt(). Single text input
 * with confirm / cancel. Enter confirms, Escape cancels. Empty string
 * is allowed (passed back to onConfirm) so callers like the link
 * toolbar can use "" as the "remove link" sentinel.
 */
export default function PromptDialog({
  open,
  title,
  label,
  defaultValue = "",
  placeholder,
  helpText,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  helpText?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);

  // Reset the input every time the dialog re-opens with a new
  // defaultValue (e.g. clicking "edit link" on a different link).
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-anamaya-charcoal/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-anamaya-olive-dark/20 bg-anamaya-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-anamaya-olive-dark/10 px-5 py-3">
          <h3 className="font-heading text-base font-semibold text-anamaya-charcoal">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 text-anamaya-charcoal/50 hover:bg-zinc-100 hover:text-anamaya-charcoal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4">
          {label && (
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
              {label}
            </span>
          )}
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onConfirm(value);
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
          {helpText && (
            <p className="mt-2 text-[11px] italic text-anamaya-charcoal/60">
              {helpText}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-anamaya-olive-dark/10 bg-white/60 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-anamaya-olive-dark/30 bg-white px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            className="rounded-full bg-anamaya-green px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
