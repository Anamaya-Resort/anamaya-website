"use client";

import Link from "next/link";
import type { SSOUser } from "@/types/sso";
import { getSSOLoginUrl } from "@/config/sso";
import UserAvatar from "./UserAvatar";

type Props = {
  user: SSOUser | null;
  /** True when the header is in transparent-over-dark-video mode. */
  lightMode: boolean;
};

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
      <UserAvatar user={user} ringColor="white" />
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
