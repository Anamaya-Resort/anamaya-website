"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Handles the SSO redirect back from sso.lightningworks.io.
 * The token arrives in the URL hash fragment (not the query string) because
 * hash fragments never hit the server — that's the SSO contract.
 */
export function SSOCallbackHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Safe-guard against a hang: if nothing has resolved in 12 s, surface a
    // "timed out" error instead of spinning forever.
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setError({
        title: "Sign-in timed out",
        detail: "The verify step didn't respond in 12 seconds. Check the browser Network tab for the /api/auth/verify request.",
      });
    }, 12_000);

    async function run() {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if (!accessToken) {
          if (!cancelled) setError({
            title: "No token in callback",
            detail: "The SSO portal didn't include an access_token in the URL fragment. Check the Network tab of DevTools.",
          });
          return;
        }

        let res: Response;
        try {
          res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken }),
          });
        } catch (e) {
          if (!cancelled) setError({
            title: "Could not reach /api/auth/verify",
            detail: String(e),
          });
          return;
        }

        let body: any = null;
        try {
          body = await res.json();
        } catch {
          // non-JSON response
          body = { error: await res.text().catch(() => "(no body)") };
        }

        if (!res.ok || !body?.success) {
          if (!cancelled) setError({
            title: `Verify failed (HTTP ${res.status})`,
            detail: body?.error ?? JSON.stringify(body).slice(0, 400),
          });
          return;
        }

        // Success — hard-navigate so the server re-reads the session cookie
        // and (site)/layout.tsx picks up the freshly-signed-in user.
        const next = searchParams.get("next") || "/";
        clearTimeout(timeoutId);
        window.location.assign(next);
      } catch (e) {
        if (!cancelled) setError({
          title: "Unexpected error",
          detail: String(e),
        });
      }
    }

    run();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-red-700">{error.title}</h1>
          {error.detail && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-anamaya-charcoal/80">
              {error.detail}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <a
              href="/auth/login"
              className="inline-block rounded-full bg-anamaya-brand-btn px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-brand-btn-hover"
            >
              Try again
            </a>
            <a
              href="/"
              className="inline-block rounded-full border border-zinc-300 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
            >
              Back to site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-anamaya-brand-btn border-t-transparent" />
        <p className="text-sm text-anamaya-charcoal/70">Signing in…</p>
      </div>
    </div>
  );
}
