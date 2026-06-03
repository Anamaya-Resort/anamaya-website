"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

// Save per-template head/footer tracking code. Re-displays the same
// template after saving (so the editor stays put).
export async function updateTemplateTracking(formData: FormData) {
  const template_slug = String(formData.get("template_slug") ?? "").trim();
  if (!template_slug) throw new Error("Missing template");
  const head_html = String(formData.get("head_html") ?? "");
  const body_html = String(formData.get("body_html") ?? "");

  const sb = supabaseServer();
  const { error } = await sb.from("template_tracking").upsert(
    { template_slug, head_html, body_html, updated_at: new Date().toISOString() },
    { onConflict: "template_slug" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/website/technical");
  // Template tracking changes affect every page of that template.
  revalidatePath("/", "layout");
  redirect(`/admin/website/technical?doc=tracking&tab=templates&template=${encodeURIComponent(template_slug)}`);
}
