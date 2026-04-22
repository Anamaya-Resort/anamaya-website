import { NextResponse } from "next/server";
import { getSSOVerifyUrl, SESSION_COOKIE } from "@/config/sso";
import { createSessionValue, sessionCookieOptions } from "@/lib/session";
import type { SSOVerifyResponse } from "@/types/sso";

/**
 * POST /api/auth/verify
 * Body: { access_token: string }
 * Verifies the token with sso.lightningworks.io and, on success, seals a
 * session cookie scoped to this site.
 */
export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return NextResponse.json(
      { success: false, error: "Server missing SESSION_SECRET (32+ chars required)" },
      { status: 500 },
    );
  }

  let body: { access_token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "Missing access_token" },
      { status: 400 },
    );
  }

  let ssoRes: Response;
  try {
    ssoRes = await fetch(getSSOVerifyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: accessToken }),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "SSO unreachable: " + String(e) },
      { status: 502 },
    );
  }

  if (!ssoRes.ok) {
    return NextResponse.json(
      { success: false, error: `SSO returned HTTP ${ssoRes.status}` },
      { status: 401 },
    );
  }

  const ssoData = (await ssoRes.json()) as SSOVerifyResponse;
  if ("error" in ssoData) {
    return NextResponse.json(
      { success: false, error: "Invalid token: " + ssoData.error },
      { status: 401 },
    );
  }

  try {
    const sealed = await createSessionValue(ssoData.user);
    const response = NextResponse.json({ success: true, user: ssoData.user });
    response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions);
    return response;
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Could not seal session: " + String(e) },
      { status: 500 },
    );
  }
}
