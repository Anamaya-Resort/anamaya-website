import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { canonicalizeSourcePath } from "@/lib/website-builder/redirects";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record one unique article view. Called client-side on page load (so it
 * still counts when the article HTML is served from the CDN cache).
 *
 * Excluded from counting:
 *   - logged-in staff/admin (any valid session) — staff are told to log in;
 *   - repeat views from the same IP (deduped by the unique (url_path,
 *     ip_hash) constraint), so a row ≈ one unique human.
 *
 * The IP is stored HASHED with a server secret, never raw — no PII retained.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const rawPath =
    typeof (body as { path?: unknown })?.path === "string"
      ? ((body as { path: string }).path)
      : "";
  if (!rawPath || rawPath.length > 512 || !rawPath.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Skip logged-in staff.
  try {
    const user = await getSessionUser();
    if (user) return NextResponse.json({ ok: true, counted: false });
  } catch {
    // No/invalid session → treat as an anonymous visitor.
  }

  const path = canonicalizeSourcePath(rawPath);
  // Prefer x-real-ip (set by Vercel's edge to the true client IP — not
  // client-spoofable). Fall back to the first x-forwarded-for hop.
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt = process.env.SESSION_SECRET ?? "anamaya-view-salt";
  const ipHash = createHash("sha256").update(`${salt}|${ip}`).digest("hex");

  const sb = supabaseServer();
  await sb
    .from("article_views")
    .upsert(
      { url_path: path, ip_hash: ipHash },
      { onConflict: "url_path,ip_hash", ignoreDuplicates: true },
    );

  return NextResponse.json({ ok: true, counted: true });
}
