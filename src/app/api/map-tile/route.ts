// Same-origin proxy for OpenStreetMap raster tiles.
//
// Used ONLY by the admin block-preview snapshot of the Google Map block:
// the live block renders an interactive Google Maps iframe, which the
// snapshot rasteriser (html-to-image) can't capture (cross-origin), so it
// falls back to a mosaic of these tiles. Serving them from our own origin
// keeps the snapshot canvas untainted. Because this is only hit while an
// admin previews/saves that block, OSM tile traffic stays negligible —
// well within OSM's tile usage policy.

export const dynamic = "force-dynamic";

function toInt(v: string | null): number | null {
  if (v === null || !/^\d+$/.test(v)) return null;
  return Number(v);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const z = toInt(searchParams.get("z"));
  const x = toInt(searchParams.get("x"));
  const y = toInt(searchParams.get("y"));

  // Validate hard: z/x/y must be integers in range. The upstream URL is
  // built purely from these validated numbers, so there's no way to point
  // the proxy at anything other than an OSM tile.
  if (z === null || x === null || y === null || z > 19) {
    return new Response("bad tile", { status: 400 });
  }
  const span = 2 ** z;
  if (x >= span || y >= span) return new Response("bad tile", { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      // OSM's tile policy requires an identifying User-Agent.
      headers: {
        "User-Agent":
          "AnamayaWebsite/1.0 (+https://anamaya.com; admin map thumbnails)",
      },
    });
  } catch {
    return new Response("tile fetch failed", { status: 502 });
  }
  if (!upstream.ok) return new Response("tile fetch failed", { status: 502 });

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}
