import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await sb
    .from("url_inventory")
    .select("url, url_path, url_kind, post_type, template_id, title, source_flags, wp_id")
    .eq("url", "https://anamaya.com/");
  console.log(JSON.stringify(data, null, 2));
}
main();
