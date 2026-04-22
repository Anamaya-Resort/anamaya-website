// Protect /admin via the LightningWorks SSO session cookie.
// Matches AnamayaOS's pattern: unseal cookie → check validity → redirect if not.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/sso";
import { unsealSession } from "@/lib/session-edge";
import { isAdminRole } from "@/lib/session-shared";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  const session = sealed ? await unsealSession(sealed) : null;

  if (!session || !isAdminRole(session.user.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    // Preserve the page the admin was trying to reach
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
