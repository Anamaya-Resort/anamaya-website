import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { canonicalizeSourcePath } from "@/lib/website-builder/redirects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record a visitor's reaction to an article. One vote per device
 * (visitorId), changeable; level 0 clears it. Writes server-side with the
 * service-role client (article_reactions has RLS on, no public policy), so
 * the browser never touches the DB directly.
 *
 * Inputs are strictly validated (path length, visitorId charset, level
 * enum) — the only untrusted-input surface — and the query is fully
 * parameterized via supabase-js, so there's no injection path.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body ?? {}) as { path?: unknown; visitorId?: unknown; level?: unknown };

  const rawPath = typeof b.path === "string" ? b.path : "";
  const visitorId = typeof b.visitorId === "string" ? b.visitorId : "";
  const level = Number(b.level);

  if (!rawPath || rawPath.length > 512 || !rawPath.startsWith("/")) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(visitorId)) {
    return NextResponse.json({ error: "bad visitor" }, { status: 400 });
  }
  if (![0, 1, 2, 3].includes(level)) {
    return NextResponse.json({ error: "bad level" }, { status: 400 });
  }

  const path = canonicalizeSourcePath(rawPath);
  const sb = supabaseServer();

  if (level === 0) {
    await sb
      .from("article_reactions")
      .delete()
      .eq("url_path", path)
      .eq("visitor_id", visitorId);
  } else {
    await sb.from("article_reactions").upsert(
      { url_path: path, visitor_id: visitorId, level },
      { onConflict: "url_path,visitor_id" },
    );
  }

  return NextResponse.json({ ok: true });
}
