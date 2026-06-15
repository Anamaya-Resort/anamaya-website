/**
 * Clone live content from the PRODUCTION Supabase into the STAGING Supabase,
 * so the sandbox/staging environment mirrors the real site for safe testing
 * of builder changes (new blocks, templates, pages).
 *
 * Reads prod via the existing SUPABASE_* env; writes staging via new
 * STAGING_SUPABASE_* env. It ONLY ever writes to staging and refuses to run
 * if the staging URL looks like production.
 *
 * Storage assets are NOT copied — frozen snapshots reference prod's PUBLIC
 * storage URLs, which load fine from staging. So this copies rows only.
 *
 * Required env (add to .env.local):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY                 (prod — already set)
 *   STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY (the new project)
 *
 * Run AFTER the staging schema exists (see STAGING_SETUP.md):
 *   npx tsx scripts/staging/clone-content.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const PROD_REF = "vytqdnwnqiqiwjhqctyi"; // production project ref — never write here

// Copied in FK-safe order: parents before children.
const TABLES = [
  "authors",
  "taxonomy_terms",
  "templates",
  "url_inventory",
  "content_items",
  "media_items",
  "seo_meta",
  "post_terms",
  "redirects",
  "site_settings",
  "page_tracking",
  "template_tracking",
];

function need(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
}

async function copyTable(prod: SupabaseClient, staging: SupabaseClient, table: string) {
  let from = 0;
  const PAGE = 1000;
  let total = 0;
  while (true) {
    const { data, error } = await prod.from(table).select("*").range(from, from + PAGE - 1);
    if (error) {
      console.log(`  ⚠ ${table}: read error (${error.message}) — skipping`);
      return;
    }
    if (!data?.length) break;
    const { error: upErr } = await staging.from(table).upsert(data);
    if (upErr) {
      console.log(`  ✗ ${table}: write error after ${total} rows — ${upErr.message}`);
      return;
    }
    total += data.length;
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  ✓ ${table}: ${total} rows`);
}

async function main() {
  const prodUrl = need("SUPABASE_URL");
  const stagingUrl = need("STAGING_SUPABASE_URL");

  // Safety: never let "staging" actually be production.
  if (stagingUrl.includes(PROD_REF) || stagingUrl === prodUrl) {
    console.error("REFUSING TO RUN: STAGING_SUPABASE_URL points at production.");
    process.exit(1);
  }

  const prod = createClient(prodUrl, need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const staging = createClient(stagingUrl, need("STAGING_SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  console.log(`Cloning content: prod → staging (${stagingUrl})\n`);
  for (const t of TABLES) await copyTable(prod, staging, t);
  console.log(
    `\nDone. (If a table errored as "does not exist", apply the schema first — see STAGING_SETUP.md.)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
