"use client";

import Link from "next/link";
import type { SSOUser } from "@/types/sso";
import { getSSOLoginUrl } from "@/config/sso";

type Props = {
  user: SSOUser | null;
  /** True when the header is in transparent-over-dark-video mode. */
  lightMode: boolean;
};

function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || name.slice(0, 1).toUpperCase();
}

function startSSOLogin() {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  window.location.href = getSSOLoginUrl(callbackUrl);
}

export default function HeaderAuth({ user, lightMode }: Props) {
  if (!user) {
    return (
      <button
        type="button"
        onClick={startSSOLogin}
        className={[
          "hidden text-sm font-semibold uppercase tracking-wider transition-colors sm:inline-block",
          lightMode
            ? "text-white hover:text-white/80"
            : "text-anamaya-charcoal hover:text-anamaya-charcoal/70",
        ].join(" ")}
      >
        Sign In
      </button>
    );
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const label = user.display_name || user.username || user.email;

  const content = (
    <div className="flex items-center gap-3">
      <span
        className={[
          "hidden text-sm font-medium sm:inline-block",
          lightMode ? "text-white" : "text-anamaya-charcoal",
        ].join(" ")}
      >
        {label}
      </span>
      <span className="block h-9 w-9 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-white">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
            {initials(label)}
          </span>
        )}
      </span>
    </div>
  );

  if (isAdmin) {
    return (
      <Link href="/admin" aria-label={`${label} — admin`}>
        {content}
      </Link>
    );
  }
  return <div aria-label={label}>{content}</div>;
}
