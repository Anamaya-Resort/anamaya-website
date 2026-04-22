// Protect /admin via the LightningWorks SSO session cookie.
// If unauthenticated, redirect DIRECTLY to the SSO portal (no local login page).

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSSOLoginUrl } from "@/config/sso";
import { unsealSession } from "@/lib/session-edge";
import { isAdminRole } from "@/lib/session-shared";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  const session = sealed ? await unsealSession(sealed) : null;

  if (!session || !isAdminRole(session.user.role)) {
    // Build the callback URL with `next` so the user lands back where they
    // were trying to go after SSO.
    const origin = request.nextUrl.origin;
    const nextPath = request.nextUrl.pathname + request.nextUrl.search;
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    return NextResponse.redirect(getSSOLoginUrl(callbackUrl));
  }

  return NextResponse.next();
}
