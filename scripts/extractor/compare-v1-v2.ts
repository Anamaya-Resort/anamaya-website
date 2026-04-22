// Compare url_inventory between v1 and v2. Match on (url_path, post_type).
// Reports: v1-only, v2-only, and both (with date diffs and which side is newer).
// Writes migration/content-diff.json.

import { sb } from "./lib";
import { writeFileSync } from "fs";
import { resolve as resolvePath } from "path";

type Row = {
  id: string;
  url: string;
  url_path: string;
  post_type: string | null;
  title: string | null;
  wp_id: number | null;
  date_published: string | null;
  date_modified: string | null;
};

async function fetchAllContentRows(siteLabel: "v1" | "v2"): Promise<Row[]> {
  const client = sb();
  // Paginate with keyset on id so we don't hit Supabase's default row cap
  const out: Row[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("url_inventory")
      .select("id, url, url_path, post_type, title, wp_id, date_published, date_modified")
      .eq("source_site", siteLabel)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as Row[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function matchKey(r: Row): string {
  return `${r.post_type ?? ""}|${r.url_path}`;
}

function parseTs(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

async function main() {
  console.log("→ fetching v1...");
  const v1 = await fetchAllContentRows("v1");
  console.log(`  ${v1.length} rows`);
  console.log("→ fetching v2...");
  const v2 = await fetchAllContentRows("v2");
  console.log(`  ${v2.length} rows`);

  const v1Map = new Map<string, Row>();
  for (const r of v1) v1Map.set(matchKey(r), r);
  const v2Map = new Map<string, Row>();
  for (const r of v2) v2Map.set(matchKey(r), r);

  const v1Only: Row[] = [];
  const v2Only: Row[] = [];
  const both: {
    key: string;
    url_path: string;
    post_type: string | null;
    v1: Row;
    v2: Row;
    v1_modified: string | null;
    v2_modified: string | null;
    newer_side: "v1" | "v2" | "equal" | "unknown";
    mod_diff_days: number | null;
    title_match: boolean;
  }[] = [];

  for (const [k, r] of v1Map) {
    if (!v2Map.has(k)) v1Only.push(r);
  }
  for (const [k, r] of v2Map) {
    if (!v1Map.has(k)) v2Only.push(r);
  }
  for (const [k, r1] of v1Map) {
    const r2 = v2Map.get(k);
    if (!r2) continue;

    const t1 = parseTs(r1.date_modified);
    const t2 = parseTs(r2.date_modified);

    let newer: "v1" | "v2" | "equal" | "unknown";
    if (t1 === null || t2 === null) newer = "unknown";
    else if (t1 > t2) newer = "v1";
    else if (t2 > t1) newer = "v2";
    else newer = "equal";

    const modDiffDays =
      t1 !== null && t2 !== null
        ? Math.round((Math.abs(t1 - t2) / 86_400_000) * 10) / 10
        : null;

    both.push({
      key: k,
      url_path: r1.url_path,
      post_type: r1.post_type,
      v1: r1,
      v2: r2,
      v1_modified: r1.date_modified,
      v2_modified: r2.date_modified,
      newer_side: newer,
      mod_diff_days: modDiffDays,
      title_match: (r1.title ?? "") === (r2.title ?? ""),
    });
  }

  const byPostType = (rows: Row[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.post_type ?? "(null)", (m.get(r.post_type ?? "(null)") ?? 0) + 1);
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
  };

  const sideCounts = both.reduce(
    (acc, b) => {
      acc[b.newer_side] = (acc[b.newer_side] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const report = {
    generated_at: new Date().toISOString(),
    v1_total_rows: v1.length,
    v2_total_rows: v2.length,
    v1_only_count: v1Only.length,
    v2_only_count: v2Only.length,
    both_count: both.length,
    newer_side_breakdown: sideCounts,
    v1_only_by_post_type: byPostType(v1Only),
    v2_only_by_post_type: byPostType(v2Only),
    v1_only: v1Only.slice(0, 2000).map((r) => ({
      url: r.url,
      url_path: r.url_path,
      post_type: r.post_type,
      title: r.title,
      date_modified: r.date_modified,
    })),
    v2_only: v2Only.slice(0, 2000).map((r) => ({
      url: r.url,
      url_path: r.url_path,
      post_type: r.post_type,
      title: r.title,
      date_modified: r.date_modified,
    })),
    diffs: both
      .filter((b) => b.newer_side === "v1" || b.newer_side === "v2")
      .slice(0, 2000)
      .map((b) => ({
        url_path: b.url_path,
        post_type: b.post_type,
        newer_side: b.newer_side,
        v1_modified: b.v1_modified,
        v2_modified: b.v2_modified,
        mod_diff_days: b.mod_diff_days,
        title_match: b.title_match,
      })),
  };

  console.log(`\n=== Summary ===`);
  console.log(`  v1 rows:         ${report.v1_total_rows}`);
  console.log(`  v2 rows:         ${report.v2_total_rows}`);
  console.log(`  both sides:      ${report.both_count}`);
  console.log(`  v1-only:         ${report.v1_only_count}`);
  console.log(`  v2-only:         ${report.v2_only_count}`);
  console.log(`  newer side:`);
  for (const [k, v] of Object.entries(sideCounts)) {
    console.log(`    ${k.padEnd(10)} ${v}`);
  }

  const outPath = resolvePath(process.cwd(), "migration/content-diff.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\n✓ wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
