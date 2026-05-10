import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Serves the frozen WP snapshot for a given url_inventory id, exactly
 * as it was captured — full HTML including the original <head>,
 * stylesheets, scripts, and Storage-rewritten asset URLs. Used by the
 * admin VIEW link so editors can preview a snapshot without worrying
 * about the new site's layout wrapping it.
 *
 * Public-route serving (visitors hitting /retreats/foo/ and seeing
 * the frozen page at the original URL) is a separate piece — needs
 * middleware + route-handler rewrite so the layout doesn't double-
 * wrap. This route is admin-preview only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("content_items")
    .select("frozen_html, frozen_at")
    .eq("url_inventory_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.frozen_html) {
    // No snapshot for this row. Could be a new page (never migrated)
    // or one Phase A failed to fetch.
    return new Response(
      `<!doctype html><html><body style="font-family:system-ui;padding:2rem;color:#444">
         <h2>No snapshot available for this page yet.</h2>
         <p>Either it was never on staging WordPress, or the snapshot
         capture skipped it. The Edit screen still works.</p>
       </body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  return new Response(data.frozen_html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Snapshots are read-only audit data; no point caching aggressively
      // since rebuilds will replace them. Five-minute browser cache is fine.
      "cache-control": "private, max-age=300",
      // Discourage indexing of the admin preview path explicitly — the
      // public-facing version (when wired) will live at the real URL.
      "x-robots-tag": "noindex",
    },
  });
}
