"use client";

import { useEffect } from "react";
import { getSSOLoginUrl } from "@/config/sso";

// Any request that lands here goes straight to sso.lightningworks.io.
// We don't render a button — the user already clicked "Sign In" somewhere
// or was redirected from middleware.
export default function LoginRedirect() {
  useEffect(() => {
    const callbackUrl = `${window.location.origin}/auth/callback`;
    window.location.replace(getSSOLoginUrl(callbackUrl));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-anamaya-brand-btn border-t-transparent" />
        <p className="text-sm text-anamaya-charcoal/70">Redirecting to sign in…</p>
      </div>
    </div>
  );
}
