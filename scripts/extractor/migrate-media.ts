// Download v2 media files and upload to the Supabase Storage `images` bucket.
// Updates media_items.storage_url and storage_key.
//
// Idempotent: skips media that already have storage_url set.
// Run: SITE=v2 npm run migrate:media

import { sb, resolveSite, chunk } from "./lib";

const BUCKET = "images";
const CONCURRENCY = 10;

// Strip the predictable WP uploads prefix so our bucket keys are cleaner.
// https://host/wp-content/uploads/2024/05/foo.jpg  →  v2/2024/05/foo.jpg
function storageKeyFor(siteLabel: string, sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl);
    let path = u.pathname;
    const m = path.match(/\/wp-content\/uploads\/(.*)$/);
    if (m) path = m[1];
    path = path.replace(/^\/+/, "");
    return `${siteLabel}/${path}`;
  } catch {
    return `${siteLabel}/unknown/${Date.now()}`;
  }
}

type MediaRow = {
  id: string;
  wp_id: number;
  source_url: string;
  mime_type: string | null;
  storage_url: string | null;
};

async function uploadOne(
  client: ReturnType<typeof sb>,
  auth: string | null,
  row: MediaRow,
  siteLabel: string,
): Promise<{ ok: true; storage_url: string; storage_key: string } | { ok: false; err: string }> {
  const key = storageKeyFor(siteLabel, row.source_url);
  const res = await fetch(row.source_url, auth ? { headers: { Authorization: auth } } : undefined).catch(
    (e) => ({ ok: false, status: 0, statusText: String(e) }) as any,
  );
  if (!res.ok) return { ok: false, err: `fetch ${row.source_url}: HTTP ${res.status}` };
  const arrayBuf = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  const contentType = row.mime_type || res.headers?.get?.("content-type") || "application/octet-stream";

  const { data, error } = await client.storage.from(BUCKET).upload(key, bytes, {
    contentType,
    upsert: true,
  });
  if (error) return { ok: false, err: `upload ${key}: ${error.message}` };

  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(data.path);
  return { ok: true, storage_url: pub.publicUrl, storage_key: data.path };
}

function authHeader(label: string): string | null {
  const user = process.env[`WP_APP_USER_${label.toUpperCase()}`];
  const pass = process.env[`WP_APP_PASSWORD_${label.toUpperCase()}`];
  if (!user || !pass) return null;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function main() {
  const { label } = resolveSite();
  const client = sb();
  const auth = authHeader(label);

  console.log(`→ [${label}] fetching media_items rows without storage_url`);
  const rows: MediaRow[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from("media_items")
      .select("id, wp_id, source_url, mime_type, storage_url")
      .eq("source_site", label)
      .is("storage_url", null)
      .not("source_url", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as MediaRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`→ ${rows.length} files to migrate`);

  let done = 0;
  let okCount = 0;
  let failCount = 0;
  const errors: { id: string; url: string; err: string }[] = [];

  // Process in concurrency chunks
  for (const batch of chunk(rows, CONCURRENCY)) {
    const results = await Promise.all(
      batch.map(async (r) => ({ row: r, result: await uploadOne(client, auth, r, label) })),
    );

    const updates = results
      .filter((x): x is { row: MediaRow; result: { ok: true; storage_url: string; storage_key: string } } => x.result.ok)
      .map((x) => ({ id: x.row.id, storage_url: x.result.storage_url, storage_key: x.result.storage_key }));

    for (const u of updates) {
      const { error } = await client
        .from("media_items")
        .update({ storage_url: u.storage_url, storage_key: u.storage_key })
        .eq("id", u.id);
      if (error) {
        failCount++;
        errors.push({ id: u.id, url: "(db)", err: error.message });
      } else {
        okCount++;
      }
    }
    for (const x of results) {
      if (!x.result.ok) {
        failCount++;
        errors.push({ id: x.row.id, url: x.row.source_url, err: x.result.err });
      }
    }

    done += batch.length;
    if (done % 100 < CONCURRENCY) {
      process.stdout.write(`  ${done}/${rows.length}  (ok=${okCount} fail=${failCount})\r`);
    }
  }

  console.log(`\n✓ [${label}] migrated ${okCount}/${rows.length}, ${failCount} failed`);
  if (errors.length > 0) {
    console.log(`\nFirst 10 errors:`);
    for (const e of errors.slice(0, 10)) {
      console.log(`  ${e.url.slice(0, 80)}  →  ${e.err}`);
    }
    if (errors.length > 10) console.log(`  ...and ${errors.length - 10} more`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
