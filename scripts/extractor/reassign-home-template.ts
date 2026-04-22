// One-shot: reassign the site-root URL (/) from single-page to the wp-home template.
// The homepage is a WP page by post type but uses a custom layout, so it gets its own template.

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
  const wpSource = process.env.WP_SOURCE_URL ?? "https://anamaya.com";
  const homeUrl = `${wpSource}/`;

  const { data: tpl, error: tplErr } = await sb
    .from("templates")
    .select("id")
    .eq("slug", "wp-home")
    .single();
  if (tplErr) throw new Error(`fetch wp-home template: ${tplErr.message}`);

  const { data, error } = await sb
    .from("url_inventory")
    .update({
      template_id: tpl.id,
      template_guess: "wp-home",
    })
    .eq("url", homeUrl)
    .select("url, template_id, template_guess, post_type, title");
  if (error) throw error;

  console.log(`✓ Reassigned ${data?.length ?? 0} row(s):`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
