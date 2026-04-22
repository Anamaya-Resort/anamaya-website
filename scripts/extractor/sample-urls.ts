// Sample URLs per post_type to sanity-check what's in inventory.
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

  const types = ["attachment", "post", "page"];
  for (const t of types) {
    console.log(`\n=== ${t} (sample 10) ===`);
    const { data } = await sb
      .from("url_inventory")
      .select("url, title")
      .eq("post_type", t)
      .limit(10);
    for (const r of data ?? []) {
      console.log(`  ${r.url}`);
      console.log(`    ${r.title?.slice(0, 80)}`);
    }
  }

  // Also look at pages with "thank" or "submit" in URL
  console.log(`\n=== "thank" / "submit" pages ===`);
  const { data: tps } = await sb
    .from("url_inventory")
    .select("url, title, post_type")
    .or("url.ilike.%thank%,url.ilike.%submit%")
    .limit(30);
  for (const r of tps ?? []) {
    console.log(`  [${r.post_type}] ${r.url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
