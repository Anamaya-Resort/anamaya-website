import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { applySnapshotTransforms } from "@/lib/snapshot/transforms";

export const dynamic = "force-dynamic";

/**
 * Serves the frozen WP snapshot for a given URL path. The catch-all
 * slug becomes the url_inventory.url_path lookup so the URL stays
 * human-readable: /snapshot/retreats/foo/ shows the snapshot of the
 * page that lived at /retreats/foo/.
 *
 * Source-agnostic / newest-wins: a page can have a captured snapshot
 * from staging (v2) and/or production (v1). We serve whichever was
 * modified most recently — that's how the v1↔v2 reconciliation ("show
 * the most recent version of each page") is actually enforced at
 * request time. Most pages only have a v2 capture (→ v2 served); the
 * ~79 pages where production is newer or production-only were captured
 * from v1 and win here by date_modified.
 *
 * Returns the captured HTML — full <html>/<head>/<body> with asset URLs
 * rewritten to Supabase Storage — run through `applySnapshotTransforms`
 * so Swarmify keeps working post-WP and dead comment forms are stripped.
 * Used both by the admin VIEW link AND by `proxy.ts`, which rewrites
 * public visits to /retreats/foo/ into /snapshot/retreats/foo/ so the
 * URL bar still reads /retreats/foo/.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  // url_inventory.url_path is stored with a leading slash and
  // (for most WP rows) a trailing slash, e.g. "/retreats/foo/".
  // Both v1 and v2 store the same url_path string, so matching the
  // slash variants finds candidate rows from either site.
  const joined = slug.map((s) => decodeURIComponent(s)).join("/");
  const candidates = [`/${joined}/`, `/${joined}`];
  if (joined === "") candidates.push("/");

  const sb = supabaseServer();
  // Pull every captured row (any site) for this path.
  //
  // Prefer v1 (production) whenever a v1 capture exists. We only capture v1
  // deliberately — for pages where production is the newest/only version OR
  // where production carries the live GHL/Sereenly form embed (the WordPress
  // FluentForms on staging die at cutover). So "a v1 capture exists" IS the
  // decision that v1 should win; everything else has only a v2 capture and
  // serves v2. source_site asc puts "v1" before "v2"; the date order is a
  // harmless tiebreak (there is at most one captured row per site per path).
  const { data: rows, error: rowErr } = await sb
    .from("url_inventory")
    .select("id, source_site, date_modified, content_items!inner(frozen_html)")
    .in("url_path", candidates)
    .not("content_items.frozen_html", "is", null)
    .order("source_site", { ascending: true })
    .order("date_modified", { ascending: false, nullsFirst: false })
    .limit(1);

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  const row = rows?.[0] as
    | { content_items: { frozen_html: string } | { frozen_html: string }[] }
    | undefined;
  const ci = row ? (Array.isArray(row.content_items) ? row.content_items[0] : row.content_items) : null;
  if (!ci?.frozen_html) {
    return notFoundHtml(`No snapshot captured for ${candidates[0]}.`);
  }

  return new Response(applySnapshotTransforms(ci.frozen_html, `/${joined}`), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Public-cacheable: brief shared cache so repeated visits are
      // fast, longer stale-while-revalidate so a redeploy or content
      // edit lands within a request after invalidation.
      "cache-control": "public, s-maxage=300, stale-while-revalidate=86400",
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
