import type { FeaturedRetreatsContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { RetreatCard, clamp, type RetreatCardData } from "./RetreatCard";

type AoRetreat = RetreatCardData & {
  is_featured: boolean | null;
  is_public: boolean | null;
  is_active: boolean | null;
};

/**
 * Featured Retreats block — async server component. Pulls retreats from
 * AO at request time: every upcoming `is_featured = true` retreat first,
 * then backfills empty slots with the soonest upcoming non-featured ones
 * up to "Number to show" (so the section never looks sparse). All sets
 * are gated to `is_public = true`, `is_active = true`, `end_date >= today`
 * so past retreats fall off automatically.
 *
 * Cards render two-across on tablet+ in a 2-column grid (each card is
 * image-left / text-right) and stack to one column on mobile.
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
  const numberToShow = Math.max(1, Math.min(50, c.max_count ?? 6));
  const registerLabel = c.register_label ?? "Register Now";
  const urlPattern = c.url_pattern || "/retreats/{slug}/";
  const containerWidth = c.container_width_px ?? 1200;
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;
  const cardBg = resolveBrandColor(c.card_bg_color);
  const cardBorder = resolveBrandColor(c.card_border_color);
  const cardBorderWidth = clamp(c.card_border_width_px ?? 1, 0, 10);
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 40);

  const retreats = await fetchFeaturedRetreats(numberToShow);

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
          <ul className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {retreats.map((r) => (
              <RetreatCard
                key={r.id}
                r={r}
                opts={{
                  urlPattern,
                  registerLabel,
                  headingColor,
                  cardBg,
                  cardBorder,
                  cardBorderWidth,
                  cardRadius,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const RETREAT_COLS =
  "id, name, excerpt, description, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link, is_featured, is_public, is_active";

/**
 * All upcoming featured retreats first (never cut off, even if more than
 * numberToShow), then backfill the remaining slots with the soonest
 * upcoming non-featured retreats. All sets share the public/active/
 * future-end gate. Service-role on AO is safe — the query is locked to
 * public+active rows; the key never reaches the browser.
 */
async function fetchFeaturedRetreats(numberToShow: number): Promise<AoRetreat[]> {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];
  const today = new Date().toISOString().slice(0, 10);

  const { data: featuredData, error: fErr } = await ao
    .from("retreats")
    .select(RETREAT_COLS)
    .eq("is_featured", true)
    .eq("is_public", true)
    .eq("is_active", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .limit(50);
  if (fErr) return [];
  const featured = (featuredData ?? []) as AoRetreat[];

  const need = Math.max(0, numberToShow - featured.length);
  if (need === 0) return featured;

  const { data: fillData } = await ao
    .from("retreats")
    .select(RETREAT_COLS)
    .or("is_featured.is.null,is_featured.eq.false")
    .eq("is_public", true)
    .eq("is_active", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .limit(need);
  const fill = (fillData ?? []) as AoRetreat[];

  const seen = new Set(featured.map((r) => r.id));
  return [...featured, ...fill.filter((r) => !seen.has(r.id))];
}
