"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";

const ALLOWED_STATUSES = new Set([
  "publish",
  "private",
  "draft",
  "pending",
  "future",
]);

// Must match SOURCE_SITE in queries.ts. Mutations are scoped to the same
// site as reads so an admin can never accidentally edit a v1 row whose
// id leaked.
const SOURCE_SITE = "v2";

export async function updateItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const postTypeSlug = String(formData.get("postTypeSlug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const cmsTemplateRaw = String(formData.get("cms_template_id") ?? "");
  const cmsBodyRaw = formData.get("cms_body_html");
  const excerpt = String(formData.get("excerpt") ?? "");

  // SEO overrides — empty string persists as null so AI/UI fall back
  // to the title / site_settings.default_meta defaults.
  const meta_title = String(formData.get("meta_title") ?? "").trim() || null;
  const meta_description =
    String(formData.get("meta_description") ?? "").trim() || null;
  const canonical_url =
    String(formData.get("canonical_url") ?? "").trim() || null;
  const og_image_url =
    String(formData.get("og_image_url") ?? "").trim() || null;
  const noindex = formData.get("noindex") === "on";

  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) throw new Error("Unknown post type");
  if (!id) throw new Error("Missing id");
  if (!ALLOWED_STATUSES.has(status)) throw new Error("Invalid status");

  const cms_template_id = cmsTemplateRaw === "" ? null : cmsTemplateRaw;

  const sb = supabaseServer();
  const { error: invErr } = await sb
    .from("url_inventory")
    .update({
      title: title || null,
      wp_status: status,
      cms_template_id,
      excerpt: excerpt || null,
      meta_title,
      meta_description,
      canonical_url,
      og_image_url,
      noindex,
      date_modified: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("post_type", pt.postType)
    .eq("source_site", SOURCE_SITE);
  if (invErr) throw new Error(invErr.message);

  if (cmsBodyRaw !== null) {
    const trimmed = String(cmsBodyRaw).trim();
    const cms_body_html = trimmed === "" ? null : String(cmsBodyRaw);
    const { error: bodyErr } = await sb
      .from("content_items")
      .upsert(
        {
          url_inventory_id: id,
          cms_body_html,
          cms_body_updated_at: new Date().toISOString(),
        },
        { onConflict: "url_inventory_id" },
      );
    if (bodyErr) throw new Error(bodyErr.message);
  }

  revalidatePath(`/admin/website/${pt.slug}`);
  revalidatePath(`/admin/website/${pt.slug}/${id}`);
}

export async function trashItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const postTypeSlug = String(formData.get("postTypeSlug") ?? "");
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) throw new Error("Unknown post type");

  const sb = supabaseServer();
  const { error } = await sb
    .from("url_inventory")
    .update({ wp_status: "trash" })
    .eq("id", id)
    .eq("post_type", pt.postType)
    .eq("source_site", SOURCE_SITE);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/website/${pt.slug}`);
  redirect(`/admin/website/${pt.slug}?status=trash`);
}

export async function restoreItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const postTypeSlug = String(formData.get("postTypeSlug") ?? "");
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) throw new Error("Unknown post type");

  const sb = supabaseServer();
  const { error } = await sb
    .from("url_inventory")
    .update({ wp_status: "draft" })
    .eq("id", id)
    .eq("post_type", pt.postType)
    .eq("source_site", SOURCE_SITE);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/website/${pt.slug}`);
  revalidatePath(`/admin/website/${pt.slug}/${id}`);
}
