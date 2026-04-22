import { Suspense } from "react";
import { SSOCallbackHandler } from "@/modules/auth/sso-callback";

export const metadata = { title: "Signing in…" };

// The SSO callback page reads the URL hash and ?next query at runtime in
// the browser — no meaningful pre-render content, but Next needs a
// Suspense boundary around the useSearchParams() call site.
export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-anamaya-brand-btn border-t-transparent" />
            <p className="text-sm text-anamaya-charcoal/70">Signing in…</p>
          </div>
        </div>
      }
    >
      <SSOCallbackHandler />
    </Suspense>
  );
}
