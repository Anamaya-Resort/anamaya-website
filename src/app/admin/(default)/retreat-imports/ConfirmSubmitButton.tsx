"use client";

import { useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import ConfirmDialog from "@/components/admin/dialogs/ConfirmDialog";

export function ConfirmSubmitButton({
  className,
  pendingLabel,
  confirmMessage,
  children,
}: {
  className: string;
  pendingLabel: string;
  confirmMessage: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (pending) {
    return (
      <button type="button" disabled className={`${className} cursor-wait opacity-60`}>
        {pendingLabel}
      </button>
    );
  }

  function fireSubmit() {
    setOpen(false);
    // Walk up to the enclosing form and submit programmatically. Using
    // requestSubmit() so the form's action runs through React's
    // server-action pipeline (and useFormStatus flips to pending).
    triggerRef.current?.closest("form")?.requestSubmit();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        title="Are you sure?"
        message={confirmMessage}
        confirmLabel="Continue"
        onConfirm={fireSubmit}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
