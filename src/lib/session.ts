import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_S,
} from "@/config/sso";
import type { SessionData, SSOUser } from "@/types/sso";

function getSessionPassword(): string {
  const pw = process.env.SESSION_SECRET;
  if (!pw || pw.length < 32) {
    throw new Error("SESSION_SECRET env var must be at least 32 characters");
  }
  return pw;
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const sealed = store.get(SESSION_COOKIE)?.value;
  if (!sealed) return null;
  try {
    const session = await unsealData<SessionData>(sealed, {
      password: getSessionPassword(),
      ttl: SESSION_MAX_AGE_S,
    });
    if (!session?.user?.id) return null;
    if (Date.now() > session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SSOUser | null> {
  const s = await getSession();
  return s?.user ?? null;
}

export async function createSessionValue(user: SSOUser): Promise<string> {
  const session: SessionData = {
    user,
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  };
  return sealData(session, {
    password: getSessionPassword(),
    ttl: SESSION_MAX_AGE_S,
  });
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE_S,
  path: "/",
};

/** Returns true if the user's SSO role qualifies them to access /admin. */
export function isAdminUser(user: SSOUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "superadmin";
}
