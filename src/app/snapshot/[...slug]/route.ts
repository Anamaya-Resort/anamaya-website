import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const SOURCE_SITE = "v2";

/**
 * Serves the frozen WP snapshot for a given URL path. The catch-all
 * slug becomes the url_inventory.url_path lookup so the URL stays
 * human-readable: /snapshot/retreats/foo/ shows the snapshot of the
 * page that lived at /retreats/foo/ on staging.
 *
 * Returns the captured HTML exactly as Phase C wrote it — full
 * <html>/<head>/<body> with all asset URLs rewritten to point at
 * Supabase Storage. Used by the admin VIEW link; public-facing
 * serving at the original URL is a separate piece (middleware
 * rewrite into here, so the URL bar shows /retreats/foo/ instead
 * of /snapshot/retreats/foo/).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  // url_inventory.url_path is stored with a leading slash and
  // (for most WP rows) a trailing slash, e.g. "/retreats/foo/".
  // Try the trailing-slash form first since that's the canonical
  // shape; fall back to the no-trailing-slash form so authors
  // can paste either.
  const joined = slug.map((s) => decodeURIComponent(s)).join("/");
  const candidates = [`/${joined}/`, `/${joined}`];
  if (joined === "") candidates.push("/");

  const sb = supabaseServer();
  const { data: row, error: rowErr } = await sb
    .from("url_inventory")
    .select("id")
    .eq("source_site", SOURCE_SITE)
    .in("url_path", candidates)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return notFoundHtml(`No row in url_inventory for ${candidates[0]}`);
  }

  const { data: content, error: contentErr } = await sb
    .from("content_items")
    .select("frozen_html, frozen_at")
    .eq("url_inventory_id", row.id)
    .maybeSingle();

  if (contentErr) {
    return NextResponse.json({ error: contentErr.message }, { status: 500 });
  }
  if (!content?.frozen_html) {
    return notFoundHtml(
      `No snapshot captured for ${candidates[0]} yet — run snapshot:rewrite once Phase A/B finish for it.`,
    );
  }

  return new Response(content.frozen_html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}

function notFoundHtml(reason: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;padding:2rem;color:#444">
       <h2>No snapshot available.</h2>
       <p>${escapeHtml(reason)}</p>
     </body></html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
