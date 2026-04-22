// Scan a representative sample of pages for tracking/analytics pixels.
// Writes to migration/tracking-audit-{site}.json.

import { sb, resolveSite } from "./lib";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve as resolvePath } from "path";

const PATTERNS: { label: string; regex: RegExp; groupIsId?: boolean }[] = [
  { label: "meta_pixel",               regex: /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/g,                                                groupIsId: true },
  { label: "ga_universal",             regex: /\b(UA-\d+-\d+)\b/g,                                                                           groupIsId: true },
  { label: "ga4",                      regex: /\b(G-[A-Z0-9]{8,})\b/g,                                                                        groupIsId: true },
  { label: "google_tag_manager",       regex: /\b(GTM-[A-Z0-9]{4,})\b/g,                                                                      groupIsId: true },
  { label: "google_ads",               regex: /\b(AW-\d{9,})\b/g,                                                                             groupIsId: true },
  { label: "google_ads_conv",          regex: /['"]send_to['"]\s*:\s*['"](AW-\d+\/[A-Za-z0-9_-]+)['"]/g,                                     groupIsId: true },
  { label: "microsoft_clarity",        regex: /clarity\.ms\/tag\/([A-Za-z0-9]+)/g,                                                            groupIsId: true },
  { label: "hotjar",                   regex: /hotjar\.com[^"']*?hjid=(\d+)|_hjSettings\s*=\s*\{[^}]*hjid\s*:\s*(\d+)/g,                     groupIsId: true },
  { label: "linkedin_insight",         regex: /_linkedin_data_partner_ids\s*=\s*\[\s*['"]?(\d+)/g,                                           groupIsId: true },
  { label: "pinterest_tag",            regex: /pintrk\s*\(\s*['"]load['"]\s*,\s*['"]([^'"]+)['"]/g,                                           groupIsId: true },
  { label: "tiktok_pixel",             regex: /ttq\.load\s*\(\s*['"]([^'"]+)['"]/g,                                                           groupIsId: true },
  { label: "crazyegg",                 regex: /(crazyegg\.com|\/pages\/scripts\/\d+\/\d+\.js)/g                                                                },
  { label: "facebook_conversions_api", regex: /connect\.facebook\.net\/[^"']+?\/fbevents\.js/g                                                                  },
];

type Finding = { label: string; id: string | null; url: string };

async function pickSamples(siteLabel: string, baseUrl: string): Promise<string[]> {
  const client = sb();
  const postTypes = [
    "page",
    "post",
    "retreat",
    "ytt",
    "cp_recipe",
    "accommodations",
    "guest_yoga_teacher",
  ];
  const samples: string[] = [`${baseUrl}/`];

  for (const pt of postTypes) {
    const { data } = await client
      .from("url_inventory")
      .select("url")
      .eq("post_type", pt)
      .eq("url_kind", "content")
      .eq("source_site", siteLabel)
      .limit(1);
    if (data?.[0]?.url && data[0].url !== `${baseUrl}/`) samples.push(data[0].url);
  }

  const { data: ty } = await client
    .from("url_inventory")
    .select("url")
    .eq("source_site", siteLabel)
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
  const { label, baseUrl } = resolveSite();
  const samples = await pickSamples(label, baseUrl);
  console.log(`→ [${label}] scanning ${samples.length} pages\n`);

  const allFindings: Finding[] = [];
  const failedUrls: string[] = [];

  for (const url of samples) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.log(`  ${url}  (HTTP ${res.status})`);
      failedUrls.push(url);
      continue;
    }
    const html = await res.text();
    const f = scanHtml(html, url);
    const summary = [...new Set(f.map((x) => (x.id ? `${x.label}=${x.id}` : x.label)))];
    console.log(`  ${url.padEnd(85)} ${summary.join(", ") || "(nothing)"}`);
    allFindings.push(...f);
  }

  const agg = new Map<string, { label: string; id: string | null; pages: Set<string> }>();
  for (const f of allFindings) {
    const key = `${f.label}|${f.id ?? ""}`;
    if (!agg.has(key)) agg.set(key, { label: f.label, id: f.id, pages: new Set() });
    agg.get(key)!.pages.add(f.url);
  }

  const outPath = resolvePath(
    process.cwd(),
    `migration/tracking-audit-${label}.json`,
  );
  const prev = existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, "utf8"))
    : {};
  const out = {
    ...prev,
    source_site_label: label,
    source_site_url: baseUrl,
    last_audited: new Date().toISOString().slice(0, 10),
    pages_scanned: samples.length,
    pages_failed: failedUrls,
    findings: [...agg.values()].map((v) => ({
      label: v.label,
      id: v.id,
      found_on: [...v.pages],
    })),
  };
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n✓ wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
