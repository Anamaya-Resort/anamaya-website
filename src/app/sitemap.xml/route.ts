import { supabaseServerOrNull } from "@/lib/supabase-server";
import { getSitemapConfig, SITE_BASE_URL } from "@/lib/website-builder/technical";

export const dynamic = "force-dynamic";

type Row = {
  url_path: string | null;
  date_modified: string | null;
  post_type: string | null;
  wp_status: string | null;
  noindex: boolean | null;
};

function normKey(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

// Serves /sitemap.xml — generated from every published page (newest version of
// each, deduped across staging/production), plus admin-configured extra URLs
// minus excluded paths (Admin → Technical → Sitemap).
export async function GET() {
  const cfg = await getSitemapConfig();
  const exclude = new Set(
    cfg.exclude_paths.split("\n").map((s) => normKey(s.trim())).filter((s) => s && s !== "/"),
  );

  // path → lastmod (most recent wins). Seed with the hand-built pages.
  const entries = new Map<string, string | null>();
  entries.set("/", null);
  entries.set("/retreats/", null);

  const sb = supabaseServerOrNull();
  if (sb) {
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from("url_inventory")
        .select("url_path, date_modified, post_type, wp_status, noindex")
        .in("source_site", ["v1", "v2"])
        .eq("wp_status", "publish")
        .neq("post_type", "attachment")
        .range(from, from + 999);
      if (error || !data?.length) break;
      for (const r of data as Row[]) {
        if (!r.url_path || r.noindex) continue;
        const path = r.url_path.startsWith("/") ? r.url_path : `/${r.url_path}`;
        if (exclude.has(normKey(path))) continue;
        const prev = entries.get(path);
        // keep the most recent date_modified seen for this path
        if (prev === undefined || (r.date_modified && (!prev || r.date_modified > prev))) {
          entries.set(path, r.date_modified ?? prev ?? null);
        }
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  // Admin-added extra absolute URLs.
  for (const raw of cfg.extra_urls.split("\n").map((s) => s.trim()).filter(Boolean)) {
    try {
      const u = new URL(raw);
      entries.set(u.pathname, entries.get(u.pathname) ?? null);
    } catch {
      /* ignore malformed */
    }
  }

  const urls = [...entries.entries()]
    .map(([path, lastmod]) => {
      const loc = `${SITE_BASE_URL}${path}`
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;");
      const lm = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
      return `<url><loc>${loc}</loc>${lm}</url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
