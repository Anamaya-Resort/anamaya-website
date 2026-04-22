// Phase 1 comprehensive: discover URLs via WP REST for a site (SITE=v1|v2),
// capturing dates, author, parent, featured media, template override, taxonomies,
// Yoast SEO metadata, and the homepage-template special case.
//
// Depends on authors + taxonomy_terms being populated first (run discover-authors,
// discover-terms before this script) so foreign keys resolve.

import { sb, resolveSite, restPaginate, pathOf, chunk } from "./lib";

// Non-content post types we don't want in url_inventory.
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
  taxonomies: string[];
};

type WpPost = {
  id: number;
  link: string;
  slug: string;
  title: { rendered: string };
  type: string;
  status: string;
  template?: string;
  date: string;            // site-local
  date_gmt: string;        // UTC - prefer this
  modified: string;
  modified_gmt: string;
  author?: number;
  featured_media?: number;
  parent?: number;
  menu_order?: number;
  excerpt?: { rendered: string };
  yoast_head_json?: any;

  // Taxonomy fields: WP exposes each taxonomy as its own array field keyed by rest_base.
  // e.g. posts have 'categories' and 'tags'. retreats may have 'retreat_week'.
  // We parse them dynamically from a list of expected keys.
  [k: string]: unknown;
};

async function main() {
  const { label, baseUrl } = resolveSite();
  const client = sb();
  console.log(`→ [${label}] ${baseUrl}`);

  // 1. Types
  const typesRes = await fetch(`${baseUrl}/wp-json/wp/v2/types`);
  if (!typesRes.ok) throw new Error(`GET types: ${typesRes.status}`);
  const allTypes = Object.values(
    (await typesRes.json()) as Record<string, WpType>,
  );
  const contentTypes = allTypes.filter(
    (t) => !SKIP_TYPES.has(t.slug) && t.rest_base,
  );
  console.log(
    `→ ${contentTypes.length} content types: ${contentTypes.map((t) => t.slug).join(", ")}`,
  );

  // 1b. Taxonomies: map taxonomy slug -> REST field name used on posts.
  // (For 'category' the field is 'categories'; for 'post_tag' it's 'tags'; etc.)
  const taxRes = await fetch(`${baseUrl}/wp-json/wp/v2/taxonomies`);
  if (!taxRes.ok) throw new Error(`GET taxonomies: ${taxRes.status}`);
  const taxRaw = (await taxRes.json()) as Record<
    string,
    { slug: string; rest_base: string }
  >;
  const taxRestBase = new Map<string, string>();
  for (const tax of Object.values(taxRaw)) {
    taxRestBase.set(tax.slug, tax.rest_base);
  }

  // 2. Upsert / ensure templates (theme singles + archives)
  console.log(`→ upserting templates...`);
  const templateMap = new Map<string, string>(); // post_type -> uuid
  for (const t of contentTypes) {
    const { data, error } = await client
      .from("templates")
      .upsert(
        {
          slug: `single-${t.slug}`,
          name: `${t.name} (single)`,
          kind: "theme",
          wp_template_file: `single-${t.slug}.php`,
          is_archive: false,
          description: `Single ${t.name}`,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    templateMap.set(t.slug, data.id);

    if (t.has_archive) {
      await client.from("templates").upsert(
        {
          slug: `archive-${t.slug}`,
          name: `${t.name} (archive)`,
          kind: "theme",
          wp_template_file: `archive-${t.slug}.php`,
          is_archive: true,
          description: `Archive for ${t.name}`,
        },
        { onConflict: "slug" },
      );
    }
  }

  // 3. Resolve wp-home template id for the site root
  const { data: homeTemplate } = await client
    .from("templates")
    .select("id")
    .eq("slug", "wp-home")
    .single();
  const homeTemplateId = homeTemplate?.id ?? null;

  // 4. Pre-fetch authors and taxonomy_terms for FK resolution
  console.log(`→ loading authors + terms for FK resolution...`);

  const authorIdByWpId = new Map<number, string>();
  {
    const { data } = await client
      .from("authors")
      .select("id, wp_id")
      .eq("source_site", label);
    for (const a of data ?? []) authorIdByWpId.set(a.wp_id, a.id);
  }

  // taxonomy_term uuid keyed by `${taxonomy}:${wp_id}`
  const termIdByTaxAndWpId = new Map<string, string>();
  {
    const { data } = await client
      .from("taxonomy_terms")
      .select("id, taxonomy, wp_id")
      .eq("source_site", label);
    for (const t of data ?? [])
      termIdByTaxAndWpId.set(`${t.taxonomy}:${t.wp_id}`, t.id);
  }

  console.log(
    `  ${authorIdByWpId.size} authors, ${termIdByTaxAndWpId.size} taxonomy terms in cache`,
  );

  // 5. Walk each content type, populate url_inventory + seo_meta + post_terms
  let grandPosts = 0;
  for (const t of contentTypes) {
    process.stdout.write(`  ${t.slug.padEnd(24)} ... `);
    // Map this type's taxonomy slugs to their REST field names on posts
    const taxFieldNames = t.taxonomies.map((s) => taxRestBase.get(s) ?? s);
    const posts = await restPaginate<WpPost>(
      baseUrl,
      `/wp-json/${t.rest_namespace}/${t.rest_base}`,
      {
        _fields:
          "id,link,slug,title,type,status,template,date,date_gmt,modified,modified_gmt,author,featured_media,parent,menu_order,excerpt,yoast_head_json" +
          (taxFieldNames.length ? "," + taxFieldNames.join(",") : ""),
      },
    ).catch((e) => {
      console.log(`(error: ${e.message})`);
      return [] as WpPost[];
    });

    if (posts.length === 0) {
      console.log("0");
      continue;
    }

    const urlRows = posts.map((p) => {
      const isHome = pathOf(p.link) === "/" && homeTemplateId;
      return {
        source_site: label,
        url: p.link,
        url_path: pathOf(p.link),
        url_kind: p.type === "attachment" ? "media" : "content",
        post_type: p.type,
        template_id: isHome ? homeTemplateId : templateMap.get(t.slug) ?? null,
        template_guess: isHome ? "wp-home" : `single-${p.type}`,
        title: p.title?.rendered ?? null,
        wp_id: p.id,
        wp_status: p.status,
        date_published: p.date_gmt ? `${p.date_gmt}Z` : null,
        date_modified: p.modified_gmt ? `${p.modified_gmt}Z` : null,
        parent_wp_id: p.parent || null,
        featured_media_wp_id: p.featured_media || null,
        menu_order: typeof p.menu_order === "number" ? p.menu_order : null,
        wp_template: p.template || null,
        excerpt: p.excerpt?.rendered?.trim() || null,
        author_id:
          p.author && authorIdByWpId.has(p.author)
            ? authorIdByWpId.get(p.author)
            : null,
        source_flags: { rest: true },
        status: "discovered" as const,
      };
    });

    // Upsert url_inventory rows, return the ids back (so we can populate junctions & seo)
    const upsertedIds = new Map<number, string>(); // wp_id -> url_inventory.id
    for (const c of chunk(urlRows, 200)) {
      const { data, error } = await client
        .from("url_inventory")
        .upsert(c, { onConflict: "source_site,url" })
        .select("id, wp_id");
      if (error) throw new Error(`upsert url_inventory: ${error.message}`);
      for (const r of data ?? []) if (r.wp_id) upsertedIds.set(r.wp_id, r.id);
    }

    // 5a. post_terms junction from each taxonomy field
    const postTermsRows: { url_inventory_id: string; taxonomy_term_id: string }[] = [];
    for (const p of posts) {
      const inventoryId = upsertedIds.get(p.id);
      if (!inventoryId) continue;
      for (const taxSlug of t.taxonomies) {
        const fieldName = taxRestBase.get(taxSlug) ?? taxSlug;
        const termIds = (p[fieldName] as number[] | undefined) ?? [];
        if (!Array.isArray(termIds)) continue;
        for (const termWpId of termIds) {
          const termUuid = termIdByTaxAndWpId.get(`${taxSlug}:${termWpId}`);
          if (termUuid) {
            postTermsRows.push({
              url_inventory_id: inventoryId,
              taxonomy_term_id: termUuid,
            });
          }
        }
      }
    }
    for (const c of chunk(postTermsRows, 500)) {
      const { error } = await client
        .from("post_terms")
        .upsert(c, { onConflict: "url_inventory_id,taxonomy_term_id" });
      if (error) throw new Error(`upsert post_terms: ${error.message}`);
    }

    // 5b. seo_meta from yoast_head_json
    const seoRows = posts
      .filter((p) => p.yoast_head_json && upsertedIds.has(p.id))
      .map((p) => {
        const y = p.yoast_head_json!;
        return {
          url_inventory_id: upsertedIds.get(p.id)!,
          meta_title: y.title ?? null,
          meta_description: y.description ?? null,
          canonical_url: y.canonical ?? null,
          og_title: y.og_title ?? null,
          og_description: y.og_description ?? null,
          og_image: y.og_image?.[0]?.url ?? null,
          og_type: y.og_type ?? null,
          twitter_title: y.twitter_title ?? null,
          twitter_description: y.twitter_description ?? null,
          twitter_image: y.twitter_image ?? null,
          robots: y.robots ?? null,
          schema_ld: y.schema ?? null,
          raw: y,
        };
      });
    for (const c of chunk(seoRows, 100)) {
      const { error } = await client
        .from("seo_meta")
        .upsert(c, { onConflict: "url_inventory_id" });
      if (error) throw new Error(`upsert seo_meta: ${error.message}`);
    }

    console.log(
      `${posts.length} URLs  ` +
        `(${postTermsRows.length} term links, ${seoRows.length} seo rows)`,
    );
    grandPosts += posts.length;
  }

  console.log(`\n✓ [${label}] ${grandPosts} URLs written to url_inventory.`);
}

main().catch((err) => {
  console.error("\n✗ Failed:", err);
  process.exit(1);
});
