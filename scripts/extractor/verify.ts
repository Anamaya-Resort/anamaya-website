// Quick verification: print counts from Supabase after extraction.
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

  const { count: templateCount } = await sb
    .from("templates")
    .select("*", { count: "exact", head: true });

  const { count: urlCount } = await sb
    .from("url_inventory")
    .select("*", { count: "exact", head: true });

  const { data: byType } = await sb
    .from("url_inventory")
    .select("post_type");

  const counts = new Map<string, number>();
  for (const r of byType ?? []) {
    const k = r.post_type ?? "(null)";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  console.log(`templates: ${templateCount}`);
  console.log(`url_inventory: ${urlCount}\n`);
  console.log("URLs by post_type:");
  for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(24)} ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
