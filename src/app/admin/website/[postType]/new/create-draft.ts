import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import { bodyToHtml } from "@/lib/website-builder/wizard-content";

// Must match SOURCE_SITE in queries.ts / [id]/actions.ts. New rows are
// created on the same staging mirror the admin reads and edits.
export const SOURCE_SITE = "v2";

// Base host for the staging WP mirror. url_inventory.url is NOT NULL and
// unique per (source_site, url); we mint it from this base + the slug so
// new native posts mirror the pattern migrated rows already use, e.g.
// https://anamayastg.wpenginepowered.com/{slug}/
const STAGING_BASE = "https://anamayastg.wpenginepowered.com";

/** Lowercase, spaces/underscores→hyphens, strip non [a-z0-9-], collapse, trim. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Insert a draft url_inventory row (+ its content_items body) and return the
 * new id. Shared by the wizard's "Create draft & open editor" action and its
 * "Continue to preview" action so the required-column logic lives in one place.
 *
 * - Mints a unique url_path/url for the post type + title slug.
 * - wp_status is always 'draft'.
 * - When `body` is a string, its bodyToHtml() is saved to content_items;
 *   an empty body persists as null (falls back to migrated/scraped content).
 */
export async function createDraftPost(args: {
  postTypeSlug: string;
  title: string;
  body: string | null;
  cms_template_id: string | null;
}): Promise<string> {
  const { postTypeSlug, cms_template_id } = args;
  const title = args.title.trim();

  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) throw new Error("Unknown post type");

  // Derive a URL slug from the title. Fall back to the post type slug when
  // the title has no slug-able characters, so we never build an empty path.
  const baseSlug = slugify(title) || pt.slug;

  const sb = supabaseServer();

  // Ensure the url_path is unique for this source_site. Pull every existing
  // path that could collide with our base slug in one query, then pick the
  // first free variant (base, base-2, base-3, …). url_path carries a trailing
  // slash to match the migrated WP rows and the unique index.
  const { data: existing, error: existErr } = await sb
    .from("url_inventory")
    .select("url_path")
    .eq("source_site", SOURCE_SITE)
    .ilike("url_path", `/${baseSlug}%`);
  if (existErr) throw new Error(existErr.message);

  const taken = new Set(
    (existing ?? []).map((r) => (r.url_path ?? "").toLowerCase()),
  );
  let slug = baseSlug;
  let n = 2;
  while (taken.has(`/${slug}/`)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const url_path = `/${slug}/`;
  const url = `${STAGING_BASE}${url_path}`;
  const now = new Date().toISOString();

  const { data: inserted, error: insErr } = await sb
    .from("url_inventory")
    .insert({
      url, // NOT NULL, unique per (source_site, url)
      url_path, // NOT NULL, unique per (source_site, url_path)
      url_kind: "content", // NOT NULL — list view filters url_kind = 'content'
      post_type: pt.postType,
      source_site: SOURCE_SITE,
      wp_status: "draft", // new posts start as drafts
      title: title || null,
      cms_template_id,
      date_published: now,
      date_modified: now,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const newId = inserted.id as string;

  // Carry the wizard's pasted body into the draft. Mirrors updateItem's
  // content_items write so the editor opens with the body already in place.
  // Empty body persists as null (falls back to migrated/scraped content).
  if (args.body !== null) {
    const trimmed = args.body.trim();
    // Preserve paragraph/line spacing: plain text -> <p>/<br>, HTML kept as-is.
    const cms_body_html = trimmed === "" ? null : bodyToHtml(args.body);
    const { error: bodyErr } = await sb.from("content_items").upsert(
      {
        url_inventory_id: newId,
        cms_body_html,
        cms_body_updated_at: now,
      },
      { onConflict: "url_inventory_id" },
    );
    if (bodyErr) throw new Error(bodyErr.message);
  }

  return newId;
}
