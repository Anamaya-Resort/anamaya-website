import Link from "next/link";
import type { FeaturedRetreatsContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { decodeEntities } from "@/lib/website-builder/decode";

type AoRetreat = {
  id: string;
  name: string | null;
  excerpt: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  feature_image_url: string | null;
  images: unknown;
  website_slug: string | null;
  registration_link: string | null;
  external_link: string | null;
  is_featured: boolean | null;
  is_public: boolean | null;
  is_active: boolean | null;
};

/**
 * Featured Retreats block — async server component. Pulls retreats
 * marked `is_featured = true` (and `is_public = true`, `is_active = true`,
 * `end_date >= today` so past retreats fall off automatically) from AO
 * at request time and renders one card per retreat.
 *
 * Cards are stacked horizontally on tablet+ (image left, text right)
 * and stack vertically on mobile. Both the image and the Register-Now
 * button link to the retreat's page on the public site (URL pattern
 * "url_pattern" with `{slug}` replaced by AO's website_slug); when a
 * retreat has no website_slug, falls back to its registration_link
 * or external_link.
 *
 * Silent on AO failures — if the env vars are missing or the query
 * fails, renders an inline empty state instead of crashing the page.
 */
export default async function FeaturedRetreatsBlock({
  content,
}: {
  content: FeaturedRetreatsContent;
}) {
  const c = content ?? {};
  const heading = c.heading ?? "Featured Retreats";
  const subheading = c.subheading ?? "";
  const maxCount = Math.max(1, Math.min(50, c.max_count ?? 5));
  const registerLabel = c.register_label ?? "Register Now";
  const urlPattern = c.url_pattern || "/retreats/{slug}/";
  const containerWidth = c.container_width_px ?? 1200;
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;
  // Card defaults: white at 40 % opacity + anamaya-mint border, no
  // shadow — matches the site's flat-card pattern (FeatureListBlock,
  // QuoteBlock, DetailsRatesDynamicBlock, PricingTableBlock all use
  // this). When the editor sets a colour, it overrides via inline
  // style; otherwise the Tailwind class supplies the default.
  const cardBg = resolveBrandColor(c.card_bg_color);
  const cardBorder = resolveBrandColor(c.card_border_color);
  // Border thickness and corner radius — inline so any value (including
  // 0) wins over the Tailwind utility classes' defaults.
  const cardBorderWidth = clamp(c.card_border_width_px ?? 1, 0, 10);
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 40);

  const retreats = await fetchFeaturedRetreats(maxCount);

  return (
    <section
      className="relative w-full"
      style={{
        backgroundColor: bg,
        color: textColor,
        paddingTop: padY,
        paddingBottom: padY,
      }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <header className="mb-10 text-center">
          {heading && (
            <h2
              className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl"
              style={{ color: headingColor }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed opacity-80">
              {subheading}
            </p>
          )}
        </header>

        {retreats.length === 0 ? (
          <p className="rounded-md border border-dashed border-anamaya-charcoal/20 bg-white/40 p-8 text-center text-sm italic opacity-60">
            No featured retreats yet. Mark a retreat as Featured in
            AnamayaOS to populate this section.
          </p>
        ) : (
          <ul className="space-y-8">
            {retreats.map((r) => {
              const href = retreatHref(r, urlPattern);
              const title = decodeEntities(r.name ?? "Untitled retreat");
              const dates = formatDateRange(r.start_date, r.end_date);
              const body = decodeEntities(stripHtml(r.excerpt ?? r.description ?? ""));
              const image = pickImage(r);
              return (
                <li key={r.id}>
                  {/*
                    Card has a fixed desktop height (264 px = ~20 % taller
                    than the previous 180 px). Both grid columns share
                    that row height, so the image fills its cell with no
                    whitespace below, and the text column is sized to
                    match. line-clamp-2 keeps the excerpt within budget.
                  */}
                  {/*
                    Image column narrowed from 2:3 (40 %) to 8:17 (32 %)
                    — the right edge of the image cell moved ≈ 20 % to
                    the left. Cell aspect ratio gets closer to the
                    image's natural 1:1, so object-cover crops less off
                    the top and bottom; the text column on the right
                    gains the freed width.
                  */}
                  <article
                    className="grid grid-cols-1 gap-6 overflow-hidden border-solid border-anamaya-mint bg-white/40 md:h-[264px] md:grid-cols-[8fr_17fr]"
                    style={{
                      borderWidth: cardBorderWidth,
                      borderRadius: cardRadius,
                      ...(cardBg ? { backgroundColor: cardBg } : null),
                      ...(cardBorder ? { borderColor: cardBorder } : null),
                    }}
                  >
                    <Link
                      href={href}
                      className="group relative block h-[264px] overflow-hidden bg-anamaya-charcoal/5 md:h-full"
                      aria-label={title}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs italic opacity-50">
                          No image
                        </div>
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-col gap-3 p-6">
                      <Link href={href} className="block">
                        <h3
                          className="font-heading text-2xl font-semibold leading-tight hover:opacity-80"
                          style={{ color: headingColor }}
                        >
                          {title}
                        </h3>
                      </Link>
                      {dates && (
                        <div className="text-sm font-semibold tracking-wide opacity-80">
                          {dates}
                        </div>
                      )}
                      {body && (
                        <p className="line-clamp-2 text-[15px] leading-relaxed opacity-90">
                          {body}
                        </p>
                      )}
                      <div className="mt-auto flex justify-end pt-2">
                        <Link
                          href={href}
                          className="inline-block rounded-full bg-anamaya-green px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
                        >
                          {registerLabel}
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

async function fetchFeaturedRetreats(maxCount: number): Promise<AoRetreat[]> {
  // Service-role on AO. Anon hits AO's RLS and sees zero retreats;
  // we use service role here because the query is already locked down
  // to `is_public = true AND is_active = true`, so even bypassing RLS
  // we only return data that's intended for the public site. Server-
  // only — the key never reaches the browser.
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ao
    .from("retreats")
    .select(
      "id, name, excerpt, description, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link, is_featured, is_public, is_active",
    )
    .eq("is_featured", true)
    .eq("is_public", true)
    .eq("is_active", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .limit(maxCount);
  if (error || !data) return [];
  return data as AoRetreat[];
}

/**
 * Build the public URL for a retreat. Prefers the website_slug pattern
 * over external links so users land on our own page; falls back to AO's
 * registration_link / external_link only when no slug exists.
 */
function retreatHref(r: AoRetreat, pattern: string): string {
  if (r.website_slug) {
    return pattern.replace(/\{slug\}/g, r.website_slug);
  }
  return r.registration_link || r.external_link || "#";
}

/**
 * Pull the main image. Tries in order:
 *   - feature_image_url (top-level)
 *   - images.large.url   (AO stores per-size variants under named keys)
 *   - images.full.url
 *   - images.medium.url
 *   - images.thumbnail.url
 *   - images[0]          (legacy array shape, just in case)
 */
function pickImage(r: AoRetreat): string | null {
  if (r.feature_image_url) return r.feature_image_url;

  // Object shape: { full|large|medium|thumbnail: { url, ... } }
  if (r.images && typeof r.images === "object" && !Array.isArray(r.images)) {
    const sized = r.images as Record<string, unknown>;
    for (const key of ["large", "full", "medium", "thumbnail"]) {
      const entry = sized[key];
      if (entry && typeof entry === "object" && "url" in entry) {
        const url = (entry as { url?: unknown }).url;
        if (typeof url === "string" && url) return url;
      }
    }
  }

  // Legacy array shape: ["url", ...] or [{url}, ...]
  if (Array.isArray(r.images) && r.images.length > 0) {
    const first = r.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url?: unknown }).url;
      if (typeof url === "string") return url;
    }
  }
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Remove all HTML tags from a string and collapse whitespace, leaving
 * plain prose. Used on AO excerpts which can contain `<p>...</p>`,
 * inline `<a>` tags, etc. — none of which we want to render literally
 * inside a card. Pair with decodeEntities to turn `&hellip;` etc. into
 * real characters.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format a date range like:
 *   - same month / year   →  "May 16 - 23, 2026"
 *   - same year, diff mo  →  "May 16 - June 2, 2026"
 *   - different years     →  "Dec 28, 2025 - Jan 3, 2026"
 *   - missing/invalid     →  "" (renderer hides the date row)
 */
function formatDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const end = endIso ? new Date(endIso) : null;
  if (end && Number.isNaN(end.getTime())) return "";

  const fmtMonthDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const fmtMonthDayYear = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-US", { day: "numeric" });

  if (!end) return `${fmtMonthDay(start)}, ${start.getFullYear()}`;

  if (start.getFullYear() !== end.getFullYear()) {
    return `${fmtMonthDayYear(start)} - ${fmtMonthDayYear(end)}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${fmtMonthDay(start)} - ${fmtDay(end)}, ${start.getFullYear()}`;
  }
  return `${fmtMonthDay(start)} - ${fmtMonthDay(end)}, ${start.getFullYear()}`;
}
