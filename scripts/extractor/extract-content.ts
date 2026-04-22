// Extract full per-post content into content_items for SITE=v1|v2.
// Pulls body HTML (rendered + raw w/ auth), ACF, full post meta, and parses _elementor_data.
// Depends on: url_inventory already populated (discover-urls.ts has run for this site).

import { sb, resolveSite, chunk, pathOf } from "./lib";
import { createHash } from "crypto";

type Row = {
  id: string;
  wp_id: number;
  post_type: string | null;
  url: string;
};

function authHeader(label: string): string | null {
  const user = process.env[`WP_APP_USER_${label.toUpperCase()}`];
  const pass = process.env[`WP_APP_PASSWORD_${label.toUpperCase()}`];
  if (!user || !pass) return null;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function fetchTypeRestBase(baseUrl: string): Promise<Map<string, string>> {
  // slug -> rest_base + rest_namespace
  const map = new Map<string, string>();
  const res = await fetch(`${baseUrl}/wp-json/wp/v2/types`);
  const data = (await res.json()) as Record<string, any>;
  for (const t of Object.values(data) as any[]) {
    if (t.rest_base)
      map.set(t.slug, `/wp-json/${t.rest_namespace}/${t.rest_base}`);
  }
  return map;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

async function fetchPost(
  baseUrl: string,
  typeEndpoint: string,
  wpId: number,
  auth: string | null,
): Promise<any | null> {
  const ctx = auth ? "edit" : "view";
  const url = `${baseUrl}${typeEndpoint}/${wpId}?context=${ctx}`;
  const res = await fetch(url, auth ? { headers: { Authorization: auth } } : undefined);
  if (!res.ok) return null;
  return await res.json();
}

async function main() {
  const { label, baseUrl } = resolveSite();
  const auth = authHeader(label);
  const client = sb();

  if (!auth) {
    console.warn(`⚠  no WP_APP_USER_${label.toUpperCase()} / WP_APP_PASSWORD_${label.toUpperCase()}`);
    console.warn(`   Proceeding with context=view (no Elementor data). Elementor-built pages will have empty content.`);
  }

  console.log(`→ [${label}] resolving type endpoints`);
  const typeEndpoints = await fetchTypeRestBase(baseUrl);

  console.log(`→ fetching content url_inventory rows for ${label}`);
  const rows: Row[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from("url_inventory")
      .select("id, wp_id, post_type, url")
      .eq("source_site", label)
      .eq("url_kind", "content")
      .not("wp_id", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`→ ${rows.length} content rows to extract`);

  let done = 0;
  let withElementor = 0;
  let failed = 0;
  let skipped = 0;
  const contentRowsBuffer: any[] = [];
  const flushIfFull = async (force = false) => {
    if (!force && contentRowsBuffer.length < 25) return;
    if (contentRowsBuffer.length === 0) return;
    const batch = contentRowsBuffer.splice(0, contentRowsBuffer.length);
    const { error } = await client
      .from("content_items")
      .upsert(batch, { onConflict: "url_inventory_id" });
    if (error) throw new Error(`upsert content_items: ${error.message}`);
  };

  for (const r of rows) {
    if (!r.post_type || r.post_type === "attachment") {
      skipped++;
      done++;
      continue;
    }
    const endpoint = typeEndpoints.get(r.post_type);
    if (!endpoint) {
      skipped++;
      done++;
      continue;
    }

    const post = await fetchPost(baseUrl, endpoint, r.wp_id, auth);
    if (!post || !post.id) {
      failed++;
      done++;
      continue;
    }

    const rendered = post.content?.rendered ?? "";
    const raw = post.content?.raw ?? null;
    const excerpt = post.excerpt?.rendered ?? null;
    const meta = (post.meta && typeof post.meta === "object" && !Array.isArray(post.meta)) ? { ...post.meta } : {};

    let elementorJson: unknown = null;
    if (typeof meta._elementor_data === "string" && meta._elementor_data.length > 0) {
      try {
        elementorJson = JSON.parse(meta._elementor_data);
        withElementor++;
      } catch {
        elementorJson = { _parse_error: true, raw: meta._elementor_data.slice(0, 5000) };
      }
      delete (meta as any)._elementor_data;
    }

    contentRowsBuffer.push({
      url_inventory_id: r.id,
      content_rendered: rendered || null,
      content_raw: raw,
      excerpt_rendered: excerpt,
      elementor_data: elementorJson,
      acf: post.acf && typeof post.acf === "object" ? post.acf : null,
      post_meta: meta,
      content_hash: rendered ? sha256(rendered) : null,
    });

    done++;
    if (done % 50 === 0) {
      process.stdout.write(`  ${done}/${rows.length} (${withElementor} with elementor, ${failed} failed)\r`);
    }
    await flushIfFull();
  }
  await flushIfFull(true);

  console.log(
    `\n✓ [${label}] ${done} processed, ${withElementor} with Elementor data, ${skipped} skipped, ${failed} failed`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
