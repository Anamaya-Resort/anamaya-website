// Phase 1 URL discovery via WP REST API.
// Populates public.templates and public.url_inventory.
//
// REST chosen over WPGraphQL for Phase 1 because:
//  - REST has a canonical post-type index (/wp-json/wp/v2/types)
//  - No introspection or type-name guessing required
//  - Returns link, slug, title, dates, template — everything we need for inventory
// WPGraphQL will be used in Phase 3 for deep content extraction (ACF fields).

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WP_SOURCE_URL = process.env.WP_SOURCE_URL ?? "https://anamaya.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Types that are not user-facing content and should be skipped during inventory.
const SKIP_TYPES = new Set([
  "wp_block",
  "wp_font_face",
  "wp_font_family",
  "wp_global_styles",
  "wp_navigation",
  "wp_template",
  "wp_template_part",
  "elementor_library",
  "elementor_snippet",
  "e-floating-buttons",
  "nav_menu_item",
  "astra-advanced-hook",
  "cartflows_step",
]);

type WpType = {
  name: string;
  slug: string;
  rest_base: string;
  rest_namespace: string;
  has_archive: boolean | string;
  hierarchical: boolean;
};

type WpPost = {
  id: number;
  link: string;
  slug: string;
  title: { rendered: string };
  type: string;
  status: string;
  template?: string;
  date: string;
  modified: string;
};

async function fetchPostTypes(): Promise<WpType[]> {
  const res = await fetch(`${WP_SOURCE_URL}/wp-json/wp/v2/types`);
  if (!res.ok) throw new Error(`GET /types failed: HTTP ${res.status}`);
  const body = (await res.json()) as Record<string, WpType>;
  return Object.values(body);
}

async function fetchAllOfType(type: WpType): Promise<WpPost[]> {
  const out: WpPost[] = [];
  const perPage = 100;
  const base = `${WP_SOURCE_URL}/wp-json/${type.rest_namespace}/${type.rest_base}`;
  const fields = "id,link,slug,title,type,status,template,date,modified";

  let page = 1;
  let totalPages = 1;

  while (true) {
    const url = `${base}?per_page=${perPage}&page=${page}&_fields=${fields}`;
    const res = await fetch(url);

    if (res.status === 400) {
      // "rest_post_invalid_page_number" — we walked past the last page
      const body = await res.json().catch(() => null);
      if (body?.code === "rest_post_invalid_page_number") break;
      throw new Error(
        `GET ${type.rest_base} page ${page}: ${JSON.stringify(body)}`,
      );
    }
    if (!res.ok) {
      throw new Error(`GET ${type.rest_base} page ${page}: HTTP ${res.status}`);
    }

    if (page === 1) {
      totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);
    }

    const batch = (await res.json()) as WpPost[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);

    if (page >= totalPages) break;
    page++;
  }

  return out;
}

function normalizePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function inferUrlKind(postType: string): string {
  return postType === "attachment" ? "media" : "content";
}

async function upsertTemplates(types: WpType[]): Promise<Map<string, string>> {
  const singleMap = new Map<string, string>();

  for (const t of types) {
    const singleRow = {
      slug: `single-${t.slug}`,
      name: `${t.name} (single)`,
      kind: "theme" as const,
      wp_template_file: `single-${t.slug}.php`,
      is_archive: false,
      description: `Single ${t.name} (post type: ${t.slug})`,
    };
    const { data, error } = await sb
      .from("templates")
      .upsert(singleRow, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`upsert template ${singleRow.slug}: ${error.message}`);
    singleMap.set(t.slug, data.id);

    if (t.has_archive) {
      const archiveRow = {
        slug: `archive-${t.slug}`,
        name: `${t.name} (archive)`,
        kind: "theme" as const,
        wp_template_file: `archive-${t.slug}.php`,
        is_archive: true,
        description: `Archive for ${t.name}`,
      };
      const { error: archiveErr } = await sb
        .from("templates")
        .upsert(archiveRow, { onConflict: "slug" });
      if (archiveErr) {
        throw new Error(`upsert template ${archiveRow.slug}: ${archiveErr.message}`);
      }
    }
  }

  return singleMap;
}

async function upsertUrls(posts: WpPost[], templateId: string): Promise<void> {
  if (posts.length === 0) return;

  const rows = posts.map((p) => ({
    url: p.link,
    url_path: normalizePath(p.link),
    url_kind: inferUrlKind(p.type),
    post_type: p.type,
    template_id: templateId,
    template_guess: `single-${p.type}`,
    title: p.title?.rendered ?? null,
    wp_id: p.id,
    source_flags: { rest: true },
    found_in_v1: true,
    status: "discovered" as const,
  }));

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb
      .from("url_inventory")
      .upsert(chunk, { onConflict: "url" });
    if (error) throw new Error(`upsert url_inventory chunk @${i}: ${error.message}`);
  }
}

async function main() {
  console.log(`→ Source: ${WP_SOURCE_URL}`);
  const allTypes = await fetchPostTypes();

  const contentTypes = allTypes
    .filter((t) => !SKIP_TYPES.has(t.slug))
    .filter((t) => !!t.rest_base);

  console.log(
    `→ ${contentTypes.length} content types: ${contentTypes.map((t) => t.slug).join(", ")}`,
  );

  console.log("→ Upserting templates...");
  const templateMap = await upsertTemplates(contentTypes);

  let total = 0;
  for (const t of contentTypes) {
    process.stdout.write(`  ${t.slug.padEnd(24)} ... `);
    const posts = await fetchAllOfType(t);
    const templateId = templateMap.get(t.slug);
    if (!templateId) throw new Error(`no template id for ${t.slug}`);
    await upsertUrls(posts, templateId);
    console.log(`${posts.length} URLs`);
    total += posts.length;
  }

  console.log(`\n✓ Done. ${total} URLs written to url_inventory.`);
}

main().catch((err) => {
  console.error("\n✗ Failed:", err);
  process.exit(1);
});
