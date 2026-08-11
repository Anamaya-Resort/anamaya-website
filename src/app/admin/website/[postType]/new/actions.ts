"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";

// Must match SOURCE_SITE in queries.ts / [id]/actions.ts. New rows are
// created on the same staging mirror the admin reads and edits.
const SOURCE_SITE = "v2";

// Base host for the staging WP mirror. url_inventory.url is NOT NULL and
// unique per (source_site, url); we mint it from this base + the slug so
// new native posts mirror the pattern migrated rows already use, e.g.
// https://anamayastg.wpenginepowered.com/{slug}/
const STAGING_BASE = "https://anamayastg.wpenginepowered.com";

/** Lowercase, spaces/underscores→hyphens, strip non [a-z0-9-], collapse, trim. */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createItem(formData: FormData) {
  const postTypeSlug = String(formData.get("postTypeSlug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const cmsTemplateRaw = String(formData.get("cms_template_id") ?? "");
  // Optional body from the Add-New wizard. When absent (legacy simple form),
  // `body` is null and we skip the content_items write entirely — backward-safe.
  const bodyRaw = formData.get("body");

  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) throw new Error("Unknown post type");

  const cms_template_id = cmsTemplateRaw === "" ? null : cmsTemplateRaw;

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
  if (bodyRaw !== null) {
    const trimmed = String(bodyRaw).trim();
    const cms_body_html = trimmed === "" ? null : String(bodyRaw);
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

  revalidatePath(`/admin/website/${pt.slug}`);
  redirect(`/admin/website/${pt.slug}/${newId}`);
}
