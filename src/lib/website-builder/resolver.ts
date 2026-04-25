import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { canonicalizeSourcePath } from "./redirects";
import { decodeEntities } from "./decode";

// Mirror queries.ts: only v2 inventory is the live source of truth.
const SOURCE_SITE = "v2";

// Statuses that should be reachable via a public URL. Drafts/pending/future
// are admin-only; trash is hidden entirely. Mirrors WP front-end semantics.
const PUBLIC_STATUSES = ["publish", "private"];

export type ContentResolution =
  | {
      kind: "redirect";
      target: string;
      status: 301 | 302 | 307 | 308;
      redirectId: string;
    }
  | { kind: "content"; row: ResolvedContent }
  | { kind: "notFound" };

export type ResolvedContent = {
  id: string;
  title: string;
  url_path: string;
  post_type: string;
  cms_template_id: string | null;
  body_html: string | null;
  excerpt: string | null;
  date_published: string | null;
  date_modified: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  noindex: boolean;
};

/**
 * Resolve an inbound request path to a redirect, a content row, or a 404.
 *
 * Order: redirects table first (so admin-managed redirects always win),
 * then url_inventory. We try the canonical path AND the trailing-slash
 * variant against url_inventory because WP exports stored URLs both ways
 * and we don't want a slash mismatch to break a page.
 */
export async function resolveContentPath(
  segments: string[],
): Promise<ContentResolution> {
  const sb = supabaseServerOrNull();
  if (!sb) return { kind: "notFound" };

  const raw = "/" + (segments ?? []).map((s) => decodeURIComponent(s)).join("/");
  const canonical = canonicalizeSourcePath(raw);

  const { data: redirectRow } = await sb
    .from("redirects")
    .select("id, target, status_code")
    .eq("source_path", canonical)
    .maybeSingle();
  if (redirectRow) {
    return {
      kind: "redirect",
      target: redirectRow.target,
      status: redirectRow.status_code as 301 | 302 | 307 | 308,
      redirectId: redirectRow.id,
    };
  }

  const variants =
    canonical === "/" ? ["/"] : [canonical, canonical + "/"];

  const { data: rows } = await sb
    .from("url_inventory")
    .select(
      "id, title, url_path, post_type, cms_template_id, scraped_body_html, excerpt, date_published, date_modified, meta_title, meta_description, canonical_url, og_image_url, noindex",
    )
    .eq("source_site", SOURCE_SITE)
    .eq("url_kind", "content")
    .in("wp_status", PUBLIC_STATUSES)
    .in("url_path", variants)
    .limit(2);

  const row = (rows ?? [])[0];
  if (!row) return { kind: "notFound" };

  const { data: content } = await sb
    .from("content_items")
    .select("cms_body_html, content_rendered")
    .eq("url_inventory_id", row.id)
    .maybeSingle();

  const body_html =
    content?.cms_body_html ??
    content?.content_rendered ??
    row.scraped_body_html ??
    null;

  return {
    kind: "content",
    row: {
      id: row.id,
      title: decodeEntities(row.title ?? ""),
      url_path: row.url_path,
      post_type: row.post_type,
      cms_template_id: row.cms_template_id,
      body_html,
      excerpt: row.excerpt ? decodeEntities(row.excerpt) : null,
      date_published: row.date_published,
      date_modified: row.date_modified,
      meta_title: row.meta_title ?? null,
      meta_description: row.meta_description ?? null,
      canonical_url: row.canonical_url ?? null,
      og_image_url: row.og_image_url ?? null,
      noindex: !!row.noindex,
    },
  };
}

/**
 * Best-effort hit counter. Fire-and-forget — never block the redirect
 * response on this. Failures are silent.
 */
export async function bumpRedirectHit(redirectId: string): Promise<void> {
  const sb = supabaseServerOrNull();
  if (!sb) return;
  // Use rpc-free path: increment via a single update with row-level read.
  // PostgREST has no atomic increment without an RPC, so we do read + write.
  // Concurrency is fine for an analytics counter.
  const { data } = await sb
    .from("redirects")
    .select("hits")
    .eq("id", redirectId)
    .maybeSingle();
  const next = (data?.hits ?? 0) + 1;
  await sb
    .from("redirects")
    .update({ hits: next, last_hit_at: new Date().toISOString() })
    .eq("id", redirectId);
}
