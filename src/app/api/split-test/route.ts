import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_TYPES = new Set(["impression", "cta_click", "dwell"]);
const MAX_DWELL_MS = 30 * 60 * 1000; // clamp implausible dwell (30 min)

/**
 * Record one first-party split-test event (impression / cta_click / dwell)
 * attributed to the variant that was actually shown. Called client-side by
 * SplitTestTracker. Logged-in staff are skipped so previews don't pollute
 * the numbers. Service-role write, so RLS stays closed to the public.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const b = (body ?? {}) as {
    groupId?: unknown;
    variantId?: unknown;
    type?: unknown;
    dwellMs?: unknown;
    vid?: unknown;
  };

  const groupId = typeof b.groupId === "string" ? b.groupId : "";
  const variantId = typeof b.variantId === "string" ? b.variantId : "";
  const type = typeof b.type === "string" ? b.type : "";
  const vid = typeof b.vid === "string" ? b.vid : "";

  if (
    !groupId ||
    groupId.length > 64 ||
    !variantId ||
    variantId.length > 64 ||
    !EVENT_TYPES.has(type) ||
    !vid ||
    vid.length > 128
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Skip logged-in staff/admins (any valid session).
  try {
    const user = await getSessionUser();
    if (user) return NextResponse.json({ ok: true, counted: false });
  } catch {
    // anonymous visitor → count it
  }

  let dwell_ms: number | null = null;
  if (type === "dwell") {
    const raw = typeof b.dwellMs === "number" ? b.dwellMs : Number(b.dwellMs);
    if (Number.isFinite(raw) && raw > 0) {
      dwell_ms = Math.min(Math.round(raw), MAX_DWELL_MS);
    }
  }

  const sb = supabaseServer();
  await sb.from("split_test_events").insert({
    group_id: groupId,
    variant_id: variantId,
    session_id: vid,
    event_type: type,
    dwell_ms,
  });

  return NextResponse.json({ ok: true, counted: true });
}
