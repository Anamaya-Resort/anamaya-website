// Public proxy (formerly middleware in Next ≤15).
//
// Two responsibilities:
//   1. /admin/*           — gate on the LightningWorks SSO session cookie;
//                           unauthenticated visitors are redirected to the
//                           SSO portal (no local login page).
//   2. Other public paths — for URLs whose url_inventory row has a frozen
//                           WP HTML snapshot but no cms_template_id,
//                           rewrite to /snapshot/<path> so the visitor
//                           sees the raw WP page at its original URL. New
//                           framework pages (rows with cms_template_id)
//                           fall through to the catch-all React renderer.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSSOLoginUrl } from "@/config/sso";
import { unsealSession } from "@/lib/session-edge";
import { isAdminRole } from "@/lib/session-shared";
import { supabaseServerOrNull } from "@/lib/supabase-server";

export const config = {
  matcher: [
    // Everything except: api routes, Next internals, the snapshot route
    // itself (target of our own rewrite — must not recurse), top-level
    // metadata files, and any path with a file extension (assets).
    "/((?!api|_next|snapshot|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.[\\w]+$).*)",
  ],
};

// Public paths handled by hardcoded React pages. Even if url_inventory
// has a matching row with a frozen snapshot, the hand-built page wins —
// don't rewrite over it. Extend as more pages are converted away from
// the snapshot fallback.
const HARDCODED_PUBLIC: RegExp[] = [
  /^\/$/,
  /^\/home2\/?$/,
  /^\/retreats\/?$/,
  /^\/retreat\/[^/]+\/?$/,
  /^\/preview(\/.*)?$/,
  /^\/block-preview(\/.*)?$/,
  /^\/auth(\/.*)?$/,
];

const SOURCE_SITE = "v2";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) /admin/* — SSO check.
  if (pathname.startsWith("/admin")) {
    const sealed = request.cookies.get(SESSION_COOKIE)?.value;
    const session = sealed ? await unsealSession(sealed) : null;

    if (!session || !isAdminRole(session.user.role)) {
      const origin = request.nextUrl.origin;
      const nextPath = request.nextUrl.pathname + request.nextUrl.search;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      return NextResponse.redirect(getSSOLoginUrl(callbackUrl));
    }
    return NextResponse.next();
  }

  // 2) Hardcoded React pages — let filesystem routing handle them.
  if (HARDCODED_PUBLIC.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  // 3) Public path — does url_inventory have a frozen WP snapshot for it?
  //    Single query joining url_inventory → content_items so we don't
  //    pay two round-trips on the hot path. Skips silently if Supabase
  //    env vars are missing (preview deploys etc.).
  //
  //    NOTE: When the new CMS framework can claim ownership of a row
  //    (via a column like cms_template_id), this is the place to add
  //    "if owned by new framework → fall through" — for now, hand-built
  //    React pages are listed in HARDCODED_PUBLIC above instead.
  const sb = supabaseServerOrNull();
  if (!sb) return NextResponse.next();

  // url_inventory.url_path is stored with a leading slash and (mostly)
  // a trailing slash. Match either shape so a slash-normalisation
  // difference doesn't silently miss the row.
  const variants = pathname === "/"
    ? ["/"]
    : Array.from(
        new Set([pathname, pathname + "/", pathname.replace(/\/$/, "")]),
      );

  // .limit(1) (not .maybeSingle): if a slash-variant ever produced two
  // matching rows, maybeSingle would error → data null → the page would
  // silently fall through to a 404. Taking the first match degrades
  // gracefully instead.
  const { data: rows } = await sb
    .from("url_inventory")
    .select("id, content_items!inner(url_inventory_id)")
    .eq("source_site", SOURCE_SITE)
    .in("url_path", variants)
    .not("content_items.frozen_html", "is", null)
    .limit(1);

  if (!rows?.length) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/snapshot${pathname.startsWith("/") ? pathname : "/" + pathname}`;
  return NextResponse.rewrite(url);
}
