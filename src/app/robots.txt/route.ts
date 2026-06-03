import { getRobotsConfig, SITE_BASE_URL } from "@/lib/website-builder/technical";

export const dynamic = "force-dynamic";

// Serves /robots.txt. Uses the custom text from Admin → Technical → robots.txt
// if set, otherwise a sensible default (allow all, hide internal paths, point
// at the sitemap).
export async function GET() {
  const { custom } = await getRobotsConfig();
  const body =
    custom.trim() ||
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api",
      "Disallow: /snapshot",
      "Disallow: /auth",
      "",
      `Sitemap: ${SITE_BASE_URL}/sitemap.xml`,
      "",
    ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Short TTL so admin edits in Technical → robots.txt show promptly
      // (the file is tiny; a long CDN cache would hide edits for an hour).
      "cache-control": "public, max-age=60",
    },
  });
}
