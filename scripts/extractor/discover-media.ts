// Populate media_items by walking /wp-json/wp/v2/media for SITE=v1|v2.
// Uses auth if WP_APP_USER / WP_APP_PASSWORD env are set for the site.

import { sb, resolveSite, chunk } from "./lib";

type WpMedia = {
  id: number;
  source_url: string;
  mime_type: string;
  media_type: string;
  title?: { rendered: string };
  alt_text?: string;
  caption?: { rendered: string };
  description?: { rendered: string };
  media_details?: {
    width?: number;
    height?: number;
    filesize?: number;
    sizes?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
};

async function paginatedFetch(
  baseUrl: string,
  auth: string | null,
): Promise<WpMedia[]> {
  const all: WpMedia[] = [];
  const perPage = 100;
  let page = 1;
  let totalPages = 1;

  while (true) {
    const url = `${baseUrl}/wp-json/wp/v2/media?per_page=${perPage}&page=${page}&_fields=id,source_url,mime_type,media_type,title,alt_text,caption,description,media_details,meta`;
    const res = await fetch(url, auth ? { headers: { Authorization: auth } } : undefined);
    if (!res.ok) {
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        if (body?.code === "rest_post_invalid_page_number") break;
      }
      throw new Error(`GET media page ${page}: HTTP ${res.status}`);
    }
    if (page === 1) {
      totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);
      console.log(`  ${totalPages} pages to walk`);
    }
    const batch = (await res.json()) as WpMedia[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (page % 5 === 0) console.log(`  page ${page}/${totalPages} (${all.length} so far)`);
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

function authHeader(siteLabel: string): string | null {
  const user = process.env[`WP_APP_USER_${siteLabel.toUpperCase()}`];
  const pass = process.env[`WP_APP_PASSWORD_${siteLabel.toUpperCase()}`];
  if (!user || !pass) return null;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function main() {
  const { label, baseUrl } = resolveSite();
  const auth = authHeader(label);
  const client = sb();

  console.log(`→ [${label}] fetching media from ${baseUrl}${auth ? " (authed)" : " (anonymous)"}`);

  const items = await paginatedFetch(baseUrl, auth);
  console.log(`→ ${items.length} media items`);

  const rows = items.map((m) => ({
    source_site: label,
    wp_id: m.id,
    source_url: m.source_url,
    mime_type: m.mime_type,
    media_type: m.media_type,
    title: m.title?.rendered || null,
    alt_text: m.alt_text || null,
    caption: m.caption?.rendered?.trim() || null,
    description: m.description?.rendered?.trim() || null,
    width: m.media_details?.width ?? null,
    height: m.media_details?.height ?? null,
    file_size_bytes: m.media_details?.filesize ?? null,
    sizes: m.media_details?.sizes ?? null,
    meta: m.meta ?? {},
  }));

  for (const c of chunk(rows, 200)) {
    const { error } = await client
      .from("media_items")
      .upsert(c, { onConflict: "source_site,wp_id" });
    if (error) throw new Error(`upsert media: ${error.message}`);
  }

  console.log(`✓ Upserted ${rows.length} media items for ${label}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
