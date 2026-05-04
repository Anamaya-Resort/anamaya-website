"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createTestimonial(formData: FormData) {
  const sb = supabaseServer();
  const review_id = str(formData.get("review_id"));
  if (!review_id) throw new Error("review_id is required");
  const review_text = str(formData.get("review_text"));
  if (!review_text) throw new Error("review_text is required");

  const { error } = await sb.from("testimonials").insert({
    review_number: num(formData.get("review_number")),
    review_id,
    review_url:   str(formData.get("review_url")),
    title:        str(formData.get("title")),
    rating:       num(formData.get("rating")) ?? 5,
    date_of_stay: str(formData.get("date_of_stay")),
    trip_type:    str(formData.get("trip_type")),
    author:       str(formData.get("author")),
    review_text,
    published:    formData.get("published") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/testimonials");
}

export async function updateTestimonial(id: string, formData: FormData) {
  const sb = supabaseServer();
  const review_id = str(formData.get("review_id"));
  if (!review_id) throw new Error("review_id is required");
  const review_text = str(formData.get("review_text"));
  if (!review_text) throw new Error("review_text is required");

  const { error } = await sb
    .from("testimonials")
    .update({
      review_number: num(formData.get("review_number")),
      review_id,
      review_url:   str(formData.get("review_url")),
      title:        str(formData.get("title")),
      rating:       num(formData.get("rating")) ?? 5,
      date_of_stay: str(formData.get("date_of_stay")),
      trip_type:    str(formData.get("trip_type")),
      author:       str(formData.get("author")),
      review_text,
      published:    formData.get("published") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/testimonials");
  revalidatePath(`/admin/testimonials/${id}`);
}

export async function deleteTestimonial(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("testimonials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/testimonials");
}

/** FormData-based wrapper so the delete button can live inside a
 *  client component (which can't define inline `"use server"` closures). */
export async function deleteTestimonialFromForm(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (id) await deleteTestimonial(id);
}

/** Client-component-friendly wrapper for updateTestimonial. Reads the
 *  id from the formData and forwards everything else to the existing
 *  update action. */
export async function updateTestimonialFromForm(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing testimonial id");
  await updateTestimonial(id, formData);
}

/**
 * Toggle the per-(testimonial × category) Visible flag. Used by the
 * Visible checkbox on each Category card in the inline edit panel on
 * /admin/testimonials. When false, the row is hidden from the
 * category's sets page AND from the public Testimonials block, but
 * the excerpt/featured/sort_order state is preserved so toggling back
 * on restores everything.
 *
 * Form fields:
 *   - testimonial_id : uuid
 *   - set_slug       : the testimonial_sets slug (e.g. "homepage")
 *   - visible        : checkbox; "on" means visible, missing means hidden
 */
export async function setAssignmentVisibilityFromForm(formData: FormData) {
  const tid = String(formData.get("testimonial_id") ?? "").trim();
  const slug = String(formData.get("set_slug") ?? "").trim();
  const visible = formData.get("visible") === "on";
  if (!tid || !slug) return;
  const sb = supabaseServer();
  const { data: set } = await sb
    .from("testimonial_sets")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!set) return;
  const { error } = await sb
    .from("testimonial_set_items")
    .update({ is_visible: visible })
    .eq("set_id", set.id)
    .eq("testimonial_id", tid);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/testimonials");
  revalidatePath(`/admin/testimonials/sets/${set.id}`);
  // Also bust public pages — hidden assignments shouldn't render publicly.
  revalidatePath("/", "layout");
}

/**
 * Set-page form save: replaces all rows for this set in one shot,
 * preserving each kept row's excerpt + featured + sort_order.
 */
export async function saveSetAssignments(
  setId: string,
  rows: Array<{
    testimonial_id: string;
    excerpt: string;
    sort_order: number;
    featured: boolean;
  }>,
) {
  const sb = supabaseServer();
  const { error: delErr } = await sb
    .from("testimonial_set_items")
    .delete()
    .eq("set_id", setId);
  if (delErr) throw new Error(delErr.message);

  if (rows.length > 0) {
    const payload = rows.map((r) => ({
      set_id: setId,
      testimonial_id: r.testimonial_id,
      sort_order: r.sort_order,
      excerpt: r.excerpt && r.excerpt.trim() !== "" ? r.excerpt.trim() : null,
      featured: r.featured,
    }));
    const { error } = await sb.from("testimonial_set_items").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/testimonials");
  revalidatePath(`/admin/testimonials/sets/${setId}`);
  revalidatePath("/", "layout");
}
