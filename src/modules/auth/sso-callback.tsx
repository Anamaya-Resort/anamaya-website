"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Handles the SSO redirect back from sso.lightningworks.io.
 * The token arrives in the URL hash fragment (not the query string) because
 * hash fragments never hit the server — that's the SSO contract.
 */
export function SSOCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    async function run() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");

      if (!accessToken) {
        setError({
          title: "No token in callback",
          detail:
            "The SSO portal didn't return an access_token in the URL fragment. " +
            "Double-check that the callback URL on this site is registered with LightningWorks SSO.",
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
        setError({
          title: "Could not reach /api/auth/verify",
          detail: String(e),
        });
        return;
      }

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = `HTTP ${res.status}: ${body.error}`;
        } catch {
          // ignore body parse failures
        }
        setError({
          title: "Verify endpoint returned an error",
          detail:
            detail +
            ". This almost always means the SESSION_SECRET env var is missing " +
            "or shorter than 32 characters on the deployment.",
        });
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setError({ title: "Authentication failed", detail: data?.error || undefined });
        return;
      }

      // Clean the hash off the URL and return to the origin page
      window.history.replaceState(null, "", next);
      router.push(next);
      router.refresh();
    }
    run();
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
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-anamaya-brand-btn px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-brand-btn-hover"
          >
            Back to site
          </a>
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
