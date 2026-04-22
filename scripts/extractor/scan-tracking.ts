// Scan a representative sample of pages for tracking/analytics pixels and output a report.
// Writes results to migration/tracking-audit.json (merged with existing data).

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const WP_SOURCE_URL = process.env.WP_SOURCE_URL ?? "https://anamaya.com";

// Per-pattern extractor: label -> { regex, extract id? }
const PATTERNS: {
  label: string;
  regex: RegExp;
  groupIsId?: boolean;
}[] = [
  { label: "meta_pixel",        regex: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/g,                 groupIsId: true },
  { label: "ga_universal",      regex: /\b(UA-\d+-\d+)\b/g,                                            groupIsId: true },
  { label: "ga4",               regex: /\b(G-[A-Z0-9]{8,})\b/g,                                        groupIsId: true },
  { label: "google_tag_manager",regex: /\b(GTM-[A-Z0-9]{4,})\b/g,                                      groupIsId: true },
  { label: "google_ads",        regex: /\b(AW-\d{9,})\b/g,                                             groupIsId: true },
  { label: "google_ads_conv",   regex: /['"]send_to['"]\s*:\s*['"](AW-\d+\/[A-Za-z0-9_-]+)['"]/g,      groupIsId: true },
  { label: "microsoft_clarity", regex: /clarity\.ms\/tag\/([A-Za-z0-9]+)/g,                            groupIsId: true },
  { label: "hotjar",            regex: /hotjar\.com[^"']*?\?[^"']*?hjid=(\d+)|_hjSettings\s*=\s*\{[^}]*hjid\s*:\s*(\d+)/g, groupIsId: true },
  { label: "linkedin_insight",  regex: /_linkedin_data_partner_ids\s*=\s*\[\s*['"]?(\d+)/g,             groupIsId: true },
  { label: "pinterest_tag",     regex: /pintrk\s*\(\s*['"]load['"]\s*,\s*['"]([^'"]+)['"]/g,            groupIsId: true },
  { label: "tiktok_pixel",      regex: /ttq\.load\s*\(\s*['"]([^'"]+)['"]/g,                            groupIsId: true },
  { label: "crazyegg",          regex: /(crazyegg\.com|\/pages\/scripts\/\d+\/\d+\.js)/g },
  { label: "facebook_conversions_api", regex: /connect\.facebook\.net\/[^"']+?\/fbevents\.js/g },
];

type Finding = {
  label: string;
  id: string | null;   // null for patterns that matched but don't carry an id
  url: string;
};

async function pickSamples(): Promise<string[]> {
  const postTypes = [
    "page",
    "post",
    "retreat",
    "ytt",
    "cp_recipe",
    "accommodations",
    "guest_yoga_teacher",
  ];

  const samples: string[] = [`${WP_SOURCE_URL}/`]; // homepage

  for (const pt of postTypes) {
    const { data } = await sb
      .from("url_inventory")
      .select("url")
      .eq("post_type", pt)
      .eq("url_kind", "content")
      .limit(1);
    if (data && data[0]?.url && data[0].url !== `${WP_SOURCE_URL}/`) {
      samples.push(data[0].url);
    }
  }

  // Also add a thank-you page if we have one
  const { data: ty } = await sb
    .from("url_inventory")
    .select("url")
    .ilike("url", "%thank-you%")
    .limit(1);
  if (ty?.[0]?.url) samples.push(ty[0].url);

  return samples;
}

function scanHtml(html: string, url: string): Finding[] {
  const findings: Finding[] = [];
  for (const p of PATTERNS) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.regex.exec(html)) !== null) {
      const id = p.groupIsId ? m[1] ?? m[2] ?? null : null;
      findings.push({ label: p.label, id, url });
    }
  }
  return findings;
}

async function main() {
  const samples = await pickSamples();
  console.log(`→ Scanning ${samples.length} pages...\n`);

  const allFindings: Finding[] = [];
  for (const url of samples) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.log(`  ${url}  (HTTP ${res.status}) — skipped`);
      continue;
    }
    const html = await res.text();
    const findings = scanHtml(html, url);
    const summary = findings
      .map((f) => (f.id ? `${f.label}=${f.id}` : f.label))
      .filter((v, i, arr) => arr.indexOf(v) === i);
    console.log(`  ${url.padEnd(80)}  ${summary.join(", ") || "(nothing)"}`);
    allFindings.push(...findings);
  }

  // Aggregate unique (label, id) with pages where found
  const agg = new Map<string, { label: string; id: string | null; pages: Set<string> }>();
  for (const f of allFindings) {
    const key = `${f.label}|${f.id ?? ""}`;
    if (!agg.has(key)) agg.set(key, { label: f.label, id: f.id, pages: new Set() });
    agg.get(key)!.pages.add(f.url);
  }

  console.log(`\n=== Summary ===`);
  for (const v of agg.values()) {
    console.log(
      `  ${v.label.padEnd(28)} ${v.id ?? "(no id)"}   on ${v.pages.size} page(s)`,
    );
  }

  // Merge into existing JSON
  const jsonPath = resolve(process.cwd(), "migration/tracking-audit.json");
  const existing = JSON.parse(readFileSync(jsonPath, "utf8"));
  existing.last_audited = new Date().toISOString().slice(0, 10);
  existing.audit_scope = `${samples.length} pages sampled: ${samples.map((u) => new URL(u).pathname).join(", ")}`;
  existing.scan_findings = [...agg.values()].map((v) => ({
    label: v.label,
    id: v.id,
    found_on: [...v.pages],
  }));
  writeFileSync(jsonPath, JSON.stringify(existing, null, 2) + "\n");
  console.log(`\n✓ migration/tracking-audit.json updated`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
