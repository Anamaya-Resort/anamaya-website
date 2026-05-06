"use client";

import { useEffect } from "react";

/**
 * Branded confirm modal — replaces window.confirm() / window.alert()
 * across the admin. Style mirrors AiRewriteModal so the editor feels
 * coherent: anamaya-green primary, olive cream chrome, rounded-full
 * action buttons. Esc cancels, click-outside cancels.
 *
 * Use `destructive` for delete-style actions (red confirm button).
 * Pass `hideCancel` to render an alert (single OK button); the X /
 * click-outside / Esc still dismiss it.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  hideCancel = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  hideCancel?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmCls = destructive
    ? "rounded-full bg-red-600 px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-50"
    : "rounded-full bg-anamaya-green px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50";

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
            disabled={busy}
            aria-label="Close"
            className="rounded p-1 text-anamaya-charcoal/50 hover:bg-zinc-100 hover:text-anamaya-charcoal disabled:opacity-50"
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

        <div className="px-5 py-4 text-sm leading-relaxed text-anamaya-charcoal/85">
          {message}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-anamaya-olive-dark/10 bg-white/60 px-5 py-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full border border-anamaya-olive-dark/30 bg-white px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={confirmCls}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
