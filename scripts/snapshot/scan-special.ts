/**
 * Scans the snapshotted "pages" (post_type=page) for content beyond
 * plain HTML+images: forms, iframes, third-party embeds, widget scripts.
 * Writes a markdown report to migration/snapshot/special-features-report.md
 * and a JSON variant for tooling.
 *
 * Run: npm run snapshot:scan-special
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { sb } from "../extractor/lib";

const HTML_DIR = resolve(process.cwd(), "migration/snapshot/html");
const OUT_DIR = resolve(process.cwd(), "migration/snapshot");

// Hosts/services we want to flag with a friendly label and a note
// about what action is needed to keep them working post-launch.
type ServiceMatch = {
  label: string;
  note: string;
  // Match function — given an iframe src or script src, returns true.
  match: (url: string) => boolean;
};
const SERVICES: ServiceMatch[] = [
  {
    label: "YouTube",
    note: "Public embed — works as-is, no action needed.",
    match: (u) =>
      /(?:youtube\.com\/embed|youtu\.be|youtube-nocookie\.com)/i.test(u),
  },
  {
    label: "Vimeo",
    note: "Public embed — works as-is.",
    match: (u) => /(?:player\.)?vimeo\.com/i.test(u),
  },
  {
    label: "Google Maps",
    note: "Public embed — works as-is.",
    match: (u) =>
      /google\.com\/maps|maps\.google\.com|maps\.googleapis\.com/i.test(u),
  },
  {
    label: "Calendly",
    note: "Booking widget — works as-is if Calendly account is active.",
    match: (u) => /calendly\.com/i.test(u),
  },
  {
    label: "Retreat Guru",
    note: "Bookings: confirm new site uses same retreat.guru account / widget URL.",
    match: (u) => /retreat\.guru|secure\.retreat\.guru/i.test(u),
  },
  {
    label: "Typeform",
    note: "Form widget — works as-is.",
    match: (u) => /typeform\.com/i.test(u),
  },
  {
    label: "Mailchimp",
    note: "Signup form / popup — replace if migrating away from Mailchimp.",
    match: (u) =>
      /mailchimp\.com|list-manage\.com|mc\.us\d+\.list-manage\.com/i.test(u),
  },
  {
    label: "HubSpot",
    note: "Form / chat widget — replace if migrating away.",
    match: (u) => /hsforms\.|hs-scripts\.|hubspot\./i.test(u),
  },
  {
    label: "Instagram",
    note: "Public embed — works as-is.",
    match: (u) => /instagram\.com/i.test(u),
  },
  {
    label: "Facebook",
    note: "Public embed — works as-is.",
    match: (u) =>
      /facebook\.com\/plugins|connect\.facebook\.net/i.test(u),
  },
  {
    label: "Twitter / X",
    note: "Public embed — works as-is.",
    match: (u) => /twitter\.com|platform\.twitter\.com|x\.com/i.test(u),
  },
  {
    label: "Stripe",
    note: "Payment — re-test after launch; may need server-side glue.",
    match: (u) => /stripe\.com/i.test(u),
  },
  {
    label: "PayPal",
    note: "Payment — re-test after launch.",
    match: (u) => /paypal\.com/i.test(u),
  },
  {
    label: "Crazy Egg",
    note: "Heatmap analytics — works if account active.",
    match: (u) => /crazyegg\.com/i.test(u),
  },
  {
    label: "Google Analytics / GTM",
    note: "Tracking — confirm property still active.",
    match: (u) =>
      /google-analytics\.com|googletagmanager\.com|googleadservices\.com/i.test(
        u,
      ),
  },
  {
    label: "Disqus",
    note: "Comments — needs site shortname configured.",
    match: (u) => /disqus\.com/i.test(u),
  },
  {
    label: "TripAdvisor",
    note: "Reviews widget — public, works as-is.",
    match: (u) => /tripadvisor/i.test(u),
  },
  {
    label: "Spotify",
    note: "Public embed — works as-is.",
    match: (u) => /spotify\.com/i.test(u),
  },
  {
    label: "SoundCloud",
    note: "Public embed — works as-is.",
    match: (u) => /soundcloud\.com/i.test(u),
  },
  {
    label: "FluentForms (WP plugin)",
    note: "WordPress contact form — submission target dies with WP. Replace.",
    match: (u) => /fluentform/i.test(u),
  },
  {
    label: "Contact Form 7 (WP plugin)",
    note: "WordPress contact form — submission target dies with WP. Replace.",
    match: (u) => /contact-form-7|wpcf7/i.test(u),
  },
  {
    label: "Gravity Forms (WP plugin)",
    note: "WordPress form — submission target dies with WP. Replace.",
    match: (u) => /gravityforms/i.test(u),
  },
  {
    label: "WishlistMember (WP plugin)",
    note: "Membership system — dies with WP. Replace if member-only pages.",
    match: (u) => /wishlist-member/i.test(u),
  },
];

type FormSummary = {
  action: string;
  method: string;
  fields: { name: string; type: string }[];
  classNames: string;
};

type PageReport = {
  title: string;
  url_path: string;
  url: string;
  forms: FormSummary[];
  iframes: { src: string; service?: string }[];
  embeds: { tag: string; src?: string }[];
  third_party_scripts: { src: string; service?: string }[];
  shortcode_residue: string[];
};

function classifyService(url: string): ServiceMatch | undefined {
  return SERVICES.find((s) => s.match(url));
}

function extractForms(html: string): FormSummary[] {
  const out: FormSummary[] = [];
  // Crude but adequate: walk every <form> opening tag, find the
  // matching </form>, snapshot the inner fields.
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  for (const m of html.matchAll(formRe)) {
    const attrs = m[1];
    const inner = m[2];
    const action = attrs.match(/\baction\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const method = (
      attrs.match(/\bmethod\s*=\s*["']([^"']*)["']/i)?.[1] ?? "GET"
    ).toUpperCase();
    const classNames =
      attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const fields: { name: string; type: string }[] = [];
    for (const fm of inner.matchAll(/<input\b([^>]*)>/gi)) {
      const a = fm[1];
      const name = a.match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1];
      const type = a.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1] ?? "text";
      if (name) fields.push({ name, type });
    }
    for (const fm of inner.matchAll(/<textarea\b([^>]*)>/gi)) {
      const name = fm[1].match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1];
      if (name) fields.push({ name, type: "textarea" });
    }
    for (const fm of inner.matchAll(/<select\b([^>]*)>/gi)) {
      const name = fm[1].match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1];
      if (name) fields.push({ name, type: "select" });
    }
    out.push({ action, method, fields, classNames });
  }
  return out;
}

function extractIframes(
  html: string,
): { src: string; service?: string }[] {
  const out: { src: string; service?: string }[] = [];
  for (const m of html.matchAll(/<iframe\b([^>]*)>/gi)) {
    const src = m[1].match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!src) continue;
    out.push({ src, service: classifyService(src)?.label });
  }
  return out;
}

function extractEmbeds(
  html: string,
): { tag: string; src?: string }[] {
  const out: { tag: string; src?: string }[] = [];
  for (const m of html.matchAll(/<embed\b([^>]*)>/gi)) {
    const src = m[1].match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1];
    out.push({ tag: "embed", src });
  }
  for (const m of html.matchAll(/<object\b([^>]*)>/gi)) {
    const data = m[1].match(/\bdata\s*=\s*["']([^"']*)["']/i)?.[1];
    out.push({ tag: "object", src: data });
  }
  return out;
}

function extractThirdPartyScripts(
  html: string,
  pageHost: string,
): { src: string; service?: string }[] {
  const out: { src: string; service?: string }[] = [];
  for (const m of html.matchAll(/<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const src = m[1];
    let host = "";
    try {
      host = new URL(src).host;
    } catch {
      continue;
    }
    if (!host) continue;
    // Skip our own host (Storage), the staging WP host, and common
    // CDNs that just serve jQuery / fonts (low-signal — they're WP
    // baseline, not site-specific).
    if (
      host.includes("supabase.co") ||
      host.includes(pageHost) ||
      host.includes("anamayastg.wpenginepowered.com") ||
      host.includes("anamaya.com") ||
      host.includes("ajax.googleapis.com") ||
      host.includes("fonts.googleapis.com") ||
      host.includes("fonts.gstatic.com") ||
      host.includes("code.jquery.com") ||
      host.includes("cdnjs.cloudflare.com")
    ) {
      continue;
    }
    out.push({ src, service: classifyService(src)?.label });
  }
  return out;
}

function extractShortcodeResidue(html: string): string[] {
  // WP shortcodes that didn't render get left as literal `[shortcode ...]`
  // in the body. Grep for the common patterns; ignore short bracketed
  // text that isn't likely a shortcode.
  const found = new Set<string>();
  for (const m of html.matchAll(/\[([a-z][a-z0-9_-]+)(?:\s[^\]]*)?\]/gi)) {
    const tag = m[1].toLowerCase();
    // Filter very common words that aren't shortcodes
    if (["br", "hr", "p", "div", "span", "img"].includes(tag)) continue;
    found.add(tag);
  }
  return Array.from(found).sort();
}

async function main() {
  console.log("Scanning v2 pages (post_type=page) for special features…");
  const c = sb();
  const { data: rows, error } = await c
    .from("url_inventory")
    .select("id, url, url_path, title")
    .eq("source_site", "v2")
    .eq("post_type", "page")
    .eq("wp_status", "publish")
    .order("url_path");
  if (error) throw error;
  console.log(`  ${rows?.length ?? 0} pages`);

  const reports: PageReport[] = [];
  for (const r of rows ?? []) {
    const htmlPath = resolve(HTML_DIR, `${r.id}.html`);
    if (!existsSync(htmlPath)) continue;
    const html = await readFile(htmlPath, "utf8");
    const pageHost = (() => {
      try {
        return new URL(r.url).host;
      } catch {
        return "";
      }
    })();
    const forms = extractForms(html);
    const iframes = extractIframes(html);
    const embeds = extractEmbeds(html);
    const third_party_scripts = extractThirdPartyScripts(html, pageHost);
    const shortcode_residue = extractShortcodeResidue(html);
    // Only include pages that have anything noteworthy.
    if (
      forms.length === 0 &&
      iframes.length === 0 &&
      embeds.length === 0 &&
      third_party_scripts.length === 0 &&
      shortcode_residue.length === 0
    ) {
      continue;
    }
    reports.push({
      title: r.title ?? "(no title)",
      url_path: r.url_path,
      url: r.url,
      forms,
      iframes,
      embeds,
      third_party_scripts,
      shortcode_residue,
    });
  }

  // Aggregate counts so the top-of-report summary tells the eye where
  // the work is concentrated.
  const formCount = reports.reduce((a, r) => a + r.forms.length, 0);
  const iframeCount = reports.reduce((a, r) => a + r.iframes.length, 0);
  const embedCount = reports.reduce((a, r) => a + r.embeds.length, 0);
  const scriptCount = reports.reduce(
    (a, r) => a + r.third_party_scripts.length,
    0,
  );

  // Service occurrences across the whole set.
  const svcHits = new Map<string, number>();
  for (const r of reports) {
    for (const i of r.iframes) {
      if (i.service) svcHits.set(i.service, (svcHits.get(i.service) ?? 0) + 1);
    }
    for (const s of r.third_party_scripts) {
      if (s.service) svcHits.set(s.service, (svcHits.get(s.service) ?? 0) + 1);
    }
  }

  // Render markdown
  const lines: string[] = [];
  lines.push("# Snapshot — special-feature scan: v2 Pages");
  lines.push("");
  lines.push(
    `Generated ${new Date().toISOString()}. Pages scanned: ${rows?.length ?? 0}. Pages with at least one special feature: ${reports.length}.`,
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Forms**: ${formCount}`);
  lines.push(`- **iframes**: ${iframeCount}`);
  lines.push(`- **<embed> / <object>**: ${embedCount}`);
  lines.push(`- **Third-party scripts**: ${scriptCount}`);
  lines.push("");
  if (svcHits.size > 0) {
    lines.push("## Services in use across these pages");
    lines.push("");
    const sorted = Array.from(svcHits.entries()).sort((a, b) => b[1] - a[1]);
    for (const [svc, n] of sorted) {
      const note = SERVICES.find((s) => s.label === svc)?.note ?? "";
      lines.push(`- **${svc}** (${n} ref${n === 1 ? "" : "s"}) — ${note}`);
    }
    lines.push("");
  }
  lines.push("## Per-page detail");
  lines.push("");
  for (const r of reports) {
    lines.push(`### ${r.title}`);
    lines.push(`\`${r.url_path}\` — [open snapshot](/snapshot${r.url_path})`);
    lines.push("");
    if (r.forms.length > 0) {
      lines.push(`**Forms (${r.forms.length}):**`);
      for (const f of r.forms) {
        const fields = f.fields.map((x) => `${x.name}(${x.type})`).join(", ");
        lines.push(
          `- \`${f.method}\` → \`${f.action || "(empty action)"}\` — ${f.fields.length} fields${fields ? ": " + fields.slice(0, 200) : ""}`,
        );
        if (f.classNames) lines.push(`  - class=\`${f.classNames}\``);
      }
      lines.push("");
    }
    if (r.iframes.length > 0) {
      lines.push(`**iframes (${r.iframes.length}):**`);
      for (const i of r.iframes) {
        lines.push(
          `- ${i.service ? `**${i.service}** — ` : ""}\`${i.src.slice(0, 200)}\``,
        );
      }
      lines.push("");
    }
    if (r.embeds.length > 0) {
      lines.push(`**embed/object (${r.embeds.length}):**`);
      for (const e of r.embeds) {
        lines.push(`- \`<${e.tag}>\` ${e.src ? `→ \`${e.src.slice(0, 200)}\`` : ""}`);
      }
      lines.push("");
    }
    if (r.third_party_scripts.length > 0) {
      lines.push(`**Third-party scripts (${r.third_party_scripts.length}):**`);
      for (const s of r.third_party_scripts) {
        lines.push(
          `- ${s.service ? `**${s.service}** — ` : ""}\`${s.src.slice(0, 200)}\``,
        );
      }
      lines.push("");
    }
    if (r.shortcode_residue.length > 0) {
      lines.push(
        `**Shortcode residue:** \`[${r.shortcode_residue.join("] [")}]\``,
      );
      lines.push("");
    }
    lines.push("");
  }

  await writeFile(
    resolve(OUT_DIR, "special-features-report.md"),
    lines.join("\n"),
    "utf8",
  );
  await writeFile(
    resolve(OUT_DIR, "special-features-report.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scanned: rows?.length ?? 0,
        with_features: reports.length,
        services: Object.fromEntries(svcHits),
        reports,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `\nDone. ${reports.length}/${rows?.length ?? 0} pages have something noteworthy.`,
  );
  console.log(
    `  ${formCount} forms · ${iframeCount} iframes · ${embedCount} embeds · ${scriptCount} third-party scripts`,
  );
  console.log(`\nReports:`);
  console.log(`  migration/snapshot/special-features-report.md`);
  console.log(`  migration/snapshot/special-features-report.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
