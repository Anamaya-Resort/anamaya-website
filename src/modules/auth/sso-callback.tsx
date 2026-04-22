"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Handles the SSO redirect back from sso.lightningworks.io.
 * The token arrives in the URL hash fragment (not the query string) because
 * hash fragments never hit the server — that's the SSO contract.
 */
export function SSOCallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");

      if (!accessToken) {
        setError("No token received. Redirecting to login…");
        setTimeout(() => router.push("/auth/login"), 2000);
        return;
      }

      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        });
        const data = await res.json();
        if (data.success) {
          router.push("/admin");
          router.refresh();
        } else {
          setError("Authentication failed. Redirecting…");
          setTimeout(() => router.push("/auth/login"), 2000);
        }
      } catch {
        setError("Authentication failed. Redirecting…");
        setTimeout(() => router.push("/auth/login"), 2000);
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle">
        <p className="text-sm text-red-600">{error}</p>
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
