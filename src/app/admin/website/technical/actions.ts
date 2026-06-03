"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

// Save one of the singleton technical-doc settings (robots / sitemap_config
// / schema). All store a small JSON object under their site_settings key.
async function saveSetting(key: string, value: Record<string, string>) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/website/technical");
}

export async function updateRobots(formData: FormData) {
  await saveSetting("robots", { custom: String(formData.get("custom") ?? "") });
  revalidatePath("/robots.txt");
  redirect("/admin/website/technical?doc=robots");
}

export async function updateSitemapConfig(formData: FormData) {
  await saveSetting("sitemap_config", {
    extra_urls: String(formData.get("extra_urls") ?? ""),
    exclude_paths: String(formData.get("exclude_paths") ?? ""),
  });
  revalidatePath("/sitemap.xml");
  redirect("/admin/website/technical?doc=sitemap");
}

export async function updateSchema(formData: FormData) {
  await saveSetting("schema", { global_jsonld: String(formData.get("global_jsonld") ?? "") });
  revalidatePath("/", "layout");
  redirect("/admin/website/technical?doc=schema");
}

export async function updateVerification(formData: FormData) {
  await saveSetting("verification", {
    google: String(formData.get("google") ?? "").trim(),
    bing: String(formData.get("bing") ?? "").trim(),
    pinterest: String(formData.get("pinterest") ?? "").trim(),
    facebook: String(formData.get("facebook") ?? "").trim(),
    custom_head: String(formData.get("custom_head") ?? ""),
  });
  revalidatePath("/", "layout");
  redirect("/admin/website/technical?doc=verification");
}

export async function updateSecurityHeaders(formData: FormData) {
  // hsts is a checkbox → stored as a string flag for the JSON value.
  await saveSetting("security_headers", {
    csp: String(formData.get("csp") ?? ""),
    hsts: formData.get("hsts") === "on" ? "true" : "",
    referrer_policy: String(formData.get("referrer_policy") ?? "").trim(),
    permissions_policy: String(formData.get("permissions_policy") ?? "").trim(),
    x_frame_options: String(formData.get("x_frame_options") ?? "").trim(),
  });
  redirect("/admin/website/technical?doc=security");
}

export async function updateSharing(formData: FormData) {
  await saveSetting("sharing", {
    app_name: String(formData.get("app_name") ?? "").trim(),
    short_name: String(formData.get("short_name") ?? "").trim(),
    theme_color: String(formData.get("theme_color") ?? "").trim(),
    background_color: String(formData.get("background_color") ?? "").trim(),
    og_image: String(formData.get("og_image") ?? "").trim(),
    square_image: String(formData.get("square_image") ?? "").trim(),
    favicon: String(formData.get("favicon") ?? "").trim(),
    icon_192: String(formData.get("icon_192") ?? "").trim(),
    icon_512: String(formData.get("icon_512") ?? "").trim(),
    apple_touch: String(formData.get("apple_touch") ?? "").trim(),
  });
  revalidatePath("/site.webmanifest");
  revalidatePath("/", "layout");
  redirect("/admin/website/technical?doc=sharing");
}
