import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * GET /api/auth/session
 * Returns the current user (or null) — useful for client-side hydration
 * and as a debug endpoint.
 */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
