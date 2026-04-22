// Phase 1: populate taxonomy_terms for a site (SITE=v1|v2).
// Enumerates all taxonomies via /wp/v2/taxonomies, then pulls terms from each.

import { sb, resolveSite, restPaginate, chunk } from "./lib";

type WpTaxonomy = {
  name: string;
  slug: string;
  rest_base: string;
  rest_namespace: string;
  hierarchical: boolean;
  description: string;
};

type WpTerm = {
  id: number;
  slug: string;
  name: string;
  description: string;
  parent?: number;
  count?: number;
  link: string;
  meta?: Record<string, unknown>;
};

// Skip non-user-facing taxonomies
const SKIP_TAXONOMIES = new Set([
  "nav_menu",
  "link_category",
  "post_format",
  "wp_theme",
  "wp_template_part_area",
  "wp_pattern_category",
  "elementor_library_type",
  "elementor_library_category",
]);

async function main() {
  const { label, baseUrl } = resolveSite();
  const client = sb();

  console.log(`→ [${label}] fetching taxonomies from ${baseUrl}`);
  const taxRes = await fetch(`${baseUrl}/wp-json/wp/v2/taxonomies`);
  if (!taxRes.ok) throw new Error(`GET taxonomies: ${taxRes.status}`);
  const taxonomies = Object.values(
    (await taxRes.json()) as Record<string, WpTaxonomy>,
  ).filter((t) => !SKIP_TAXONOMIES.has(t.slug) && t.rest_base);

  console.log(
    `→ ${taxonomies.length} taxonomies: ${taxonomies.map((t) => t.slug).join(", ")}`,
  );

  let grandTotal = 0;
  for (const tax of taxonomies) {
    process.stdout.write(`  ${tax.slug.padEnd(28)} ... `);
    const terms = await restPaginate<WpTerm>(
      baseUrl,
      `/wp-json/${tax.rest_namespace}/${tax.rest_base}`,
      { _fields: "id,slug,name,description,parent,count,link,meta" },
    ).catch((e) => {
      console.log(`(error: ${e.message})`);
      return [];
    });

    if (terms.length === 0) {
      console.log("0");
      continue;
    }

    const rows = terms.map((t) => ({
      source_site: label,
      taxonomy: tax.slug,
      wp_id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description || null,
      parent_wp_id: t.parent || null,
      post_count: typeof t.count === "number" ? t.count : null,
      archive_url: t.link,
      meta: t.meta ?? {},
    }));

    for (const c of chunk(rows, 200)) {
      const { error } = await client
        .from("taxonomy_terms")
        .upsert(c, { onConflict: "source_site,taxonomy,wp_id" });
      if (error) throw new Error(`upsert ${tax.slug}: ${error.message}`);
    }

    console.log(terms.length);
    grandTotal += terms.length;
  }

  console.log(`\n✓ Upserted ${grandTotal} terms for ${label}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
