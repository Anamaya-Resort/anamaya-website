"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

type Section = "general" | "default_meta" | "tracking";

const SECTION_FIELDS: Record<Section, string[]> = {
  general: ["site_title", "tagline", "timezone"],
  default_meta: ["meta_description", "og_image_url"],
  tracking: [
    "ga4_id",
    "gtm_id",
    "facebook_pixel_id",
    "custom_head_html",
    "custom_body_html",
  ],
};

function isSection(s: string): s is Section {
  return s === "general" || s === "default_meta" || s === "tracking";
}

export async function updateSettingsSection(formData: FormData) {
  const section = String(formData.get("section") ?? "");
  if (!isSection(section)) throw new Error("Unknown settings section");

  const value: Record<string, string> = {};
  for (const field of SECTION_FIELDS[section]) {
    value[field] = String(formData.get(field) ?? "").trim();
  }

  const sb = supabaseServer();
  const { error } = await sb
    .from("site_settings")
    .upsert(
      { key: section, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/website/settings");
  // Tracking changes affect the public site shell on every page.
  if (section === "tracking") revalidatePath("/", "layout");
}
