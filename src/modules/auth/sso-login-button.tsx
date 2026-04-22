"use client";

import { LogIn } from "lucide-react";
import { getSSOLoginUrl } from "@/config/sso";

export function SSOLoginButton({ label = "Sign in" }: { label?: string }) {
  function handleLogin() {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    window.location.href = getSSOLoginUrl(callbackUrl);
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-anamaya-brand-btn px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-brand-btn-hover"
    >
      <LogIn className="h-4 w-4" />
      {label}
    </button>
  );
}
