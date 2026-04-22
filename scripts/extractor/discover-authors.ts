// Populate `authors` for SITE=v1|v2.
// Strategy:
//   1. Try WPGraphQL /graphql `users` query (works on v2; blocked on v1 by WordFence).
//   2. On failure, fall back to parsing yoast_head_json.schema from each post
//      (works on v1 with Yoast; won't work on v2 which uses Rank Math).

import { sb, resolveSite, restPaginate, chunk } from "./lib";

type AuthorInfo = {
  wp_id: number;
  slug: string;
  display_name: string;
  description: string | null;
  archive_url: string;
  same_as: string[];
};

async function tryGraphQLAuthors(baseUrl: string): Promise<AuthorInfo[] | null> {
  const all: AuthorInfo[] = [];
  let after: string | null = null;

  while (true) {
    const q = `query ($after: String) { users(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { databaseId slug name description uri } } }`;
    const res: Response | null = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, variables: { after } }),
    }).catch(() => null);
    if (!res || !res.ok) return null;

    const body = await res.json().catch(() => null);
    if (!body?.data?.users) return null;
    const nodes = body.data.users.nodes ?? [];
    for (const n of nodes) {
      all.push({
        wp_id: n.databaseId,
        slug: n.slug,
        display_name: n.name,
        description: n.description || null,
        archive_url: n.uri ? new URL(n.uri, baseUrl).toString() : `${baseUrl}/author/${n.slug}/`,
        same_as: [],
      });
    }
    const pi = body.data.users.pageInfo;
    if (!pi?.hasNextPage) break;
    after = pi.endCursor;
  }
  return all;
}

function slugFromAuthorUrl(url: string): string | null {
  try {
    return new URL(url).pathname.match(/\/author\/([^/]+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function yoastSchemaAuthors(baseUrl: string): Promise<AuthorInfo[]> {
  const typesRes = await fetch(`${baseUrl}/wp-json/wp/v2/types`);
  const contentTypes = Object.values(
    (await typesRes.json()) as Record<string, any>,
  ).filter((t: any) => t.rest_base && !/^(wp_|elementor_|e-|nav_menu|astra-|cartflows_|attachment)/.test(t.slug));

  const authors = new Map<number, AuthorInfo>();
  for (const t of contentTypes) {
    const posts = await restPaginate<any>(
      baseUrl,
      `/wp-json/${t.rest_namespace}/${t.rest_base}`,
      { _fields: "id,author,yoast_head_json" },
    ).catch(() => []);
    for (const p of posts) {
      if (!p.author || authors.has(p.author)) continue;
      const graph = p.yoast_head_json?.schema?.["@graph"];
      if (!Array.isArray(graph)) continue;
      for (const node of graph) {
        if (node?.["@type"] !== "Person" || typeof node.url !== "string") continue;
        const slug = slugFromAuthorUrl(node.url);
        if (!slug) continue;
        authors.set(p.author, {
          wp_id: p.author,
          slug,
          display_name: typeof node.name === "string" ? node.name : slug,
          description: typeof node.description === "string" ? node.description : null,
          archive_url: node.url,
          same_as: Array.isArray(node.sameAs) ? node.sameAs.filter((x: unknown) => typeof x === "string") : [],
        });
        break;
      }
    }
  }
  return [...authors.values()];
}

async function main() {
  const { label, baseUrl } = resolveSite();
  const client = sb();

  console.log(`→ [${label}] trying WPGraphQL /graphql users query`);
  let authors = await tryGraphQLAuthors(baseUrl);
  let source = "wpgraphql";
  if (!authors || authors.length === 0) {
    console.log(`  GraphQL unavailable or blocked, falling back to Yoast schema parsing`);
    authors = await yoastSchemaAuthors(baseUrl);
    source = "yoast-schema";
  }

  console.log(`→ ${authors.length} authors via ${source}`);

  const rows = authors.map((a) => ({
    source_site: label,
    wp_id: a.wp_id,
    slug: a.slug,
    display_name: a.display_name,
    description: a.description,
    avatar_url: null,
    archive_url: a.archive_url,
    meta: { same_as: a.same_as, discovered_via: source },
  }));

  for (const c of chunk(rows, 100)) {
    const { error } = await client
      .from("authors")
      .upsert(c, { onConflict: "source_site,wp_id" });
    if (error) throw new Error(`upsert authors: ${error.message}`);
  }
  console.log(`✓ Upserted ${rows.length} authors for ${label}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
