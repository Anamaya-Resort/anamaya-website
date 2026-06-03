import { getSharingConfig } from "@/lib/website-builder/technical";

export const dynamic = "force-dynamic";

// Serves /site.webmanifest from the Social & Icons settings. Icons are the
// uploaded Storage URLs. Browsers use this for "add to home screen" / PWA
// install and the theme color.
export async function GET() {
  const s = await getSharingConfig();
  const icons: { src: string; sizes: string; type: string; purpose?: string }[] = [];
  if (s.icon_192) icons.push({ src: s.icon_192, sizes: "192x192", type: "image/png" });
  if (s.icon_512) icons.push({ src: s.icon_512, sizes: "512x512", type: "image/png" });
  if (s.apple_touch) icons.push({ src: s.apple_touch, sizes: "180x180", type: "image/png" });

  const manifest = {
    name: s.app_name || "Anamaya Resort",
    short_name: s.short_name || s.app_name || "Anamaya",
    start_url: "/",
    display: "standalone",
    theme_color: s.theme_color || "#A0BF52",
    background_color: s.background_color || "#ffffff",
    icons,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
