"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

export async function createTestimonial(formData: FormData) {
  const sb = supabaseServer();
  const { error } = await sb.from("testimonials").insert({
    author: String(formData.get("author") ?? "").trim(),
    source: (formData.get("source") as string) || null,
    source_date: (formData.get("source_date") as string) || null,
    rating: Number(formData.get("rating") || 5),
    headline: (formData.get("headline") as string) || null,
    quote: String(formData.get("quote") ?? "").trim(),
    published: formData.get("published") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/testimonials");
}

export async function updateTestimonial(id: string, formData: FormData) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("testimonials")
    .update({
      author: String(formData.get("author") ?? "").trim(),
      source: (formData.get("source") as string) || null,
      source_date: (formData.get("source_date") as string) || null,
      rating: Number(formData.get("rating") || 5),
      headline: (formData.get("headline") as string) || null,
      quote: String(formData.get("quote") ?? "").trim(),
      published: formData.get("published") === "on",
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

export async function updateSetMembership(setId: string, testimonialIds: string[]) {
  const sb = supabaseServer();
  // Wipe then re-insert preserving provided order
  const { error: delErr } = await sb
    .from("testimonial_set_items")
    .delete()
    .eq("set_id", setId);
  if (delErr) throw new Error(delErr.message);

  if (testimonialIds.length > 0) {
    const rows = testimonialIds.map((tid, i) => ({
      set_id: setId,
      testimonial_id: tid,
      sort_order: i,
    }));
    const { error } = await sb.from("testimonial_set_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/testimonials");
  revalidatePath(`/admin/testimonials/sets/${setId}`);
  // Invalidate all public pages that pull testimonial sets
  revalidatePath("/", "layout");
}
