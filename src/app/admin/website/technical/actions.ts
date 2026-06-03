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
