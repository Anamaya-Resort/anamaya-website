import { NextResponse } from "next/server";
import { getSSOVerifyUrl } from "@/config/sso";
import { createSessionValue, sessionCookieOptions } from "@/lib/session";
import { SESSION_COOKIE } from "@/config/sso";
import type { SSOVerifyResponse } from "@/types/sso";

/**
 * POST /api/auth/verify
 * Body: { access_token: string }
 * Verifies the token with sso.lightningworks.io and, on success, seals a
 * session cookie scoped to this site.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Missing access_token" }, { status: 400 });
  }

  const ssoRes = await fetch(getSSOVerifyUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: accessToken }),
  });
  if (!ssoRes.ok) {
    return NextResponse.json({ success: false, error: "Token verification failed" }, { status: 401 });
  }

  const ssoData = (await ssoRes.json()) as SSOVerifyResponse;
  if ("error" in ssoData) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const sealed = await createSessionValue(ssoData.user);
  const response = NextResponse.json({ success: true, user: ssoData.user });
  response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions);
  return response;
}
