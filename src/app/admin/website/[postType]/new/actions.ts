"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import { createDraftPost } from "./create-draft";

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

  const newId = await createDraftPost({
    postTypeSlug,
    title,
    body: bodyRaw === null ? null : String(bodyRaw),
    cms_template_id,
  });

  revalidatePath(`/admin/website/${pt.slug}`);
  redirect(`/admin/website/${pt.slug}/${newId}`);
}
