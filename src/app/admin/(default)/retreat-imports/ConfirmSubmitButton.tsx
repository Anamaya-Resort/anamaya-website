"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";

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
  const [confirmed, setConfirmed] = useState(false);

  if (pending) {
    return (
      <button type="button" disabled className={`${className} cursor-wait opacity-60`}>
        {pendingLabel}
      </button>
    );
  }

  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirmed && !window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        setConfirmed(true);
      }}
    >
      {children}
    </button>
  );
}
