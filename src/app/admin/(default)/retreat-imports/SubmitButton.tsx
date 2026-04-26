"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  className,
  pendingLabel,
  children,
  title,
}: {
  className: string;
  pendingLabel: string;
  children: React.ReactNode;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
