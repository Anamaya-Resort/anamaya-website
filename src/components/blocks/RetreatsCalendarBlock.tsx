import type { RetreatsCalendarContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { decodeEntities } from "@/lib/website-builder/decode";
import {
  pickImage,
  stripHtml,
  formatDateRange,
  clamp,
  type RetreatCardData,
} from "./RetreatCard";
import LayoutWidths from "./shared/LayoutWidths";

type AoRetreat = RetreatCardData & {
  tagline: string | null;
  is_sold_out: boolean | null;
  registration_status: string | null;
};

/**
 * Retreats Calendar block — async server component. The public,
 * on-brand replacement for the Retreat Guru `rg-calendar` embed (lives
 * at /book-retreat). Lists every UPCOMING retreat from AnamayaOS in
 * date order, optionally grouped by month, each with a Book button that
 * links out to Retreat Guru (booking itself always stays on Retreat
 * Guru — we never handle payment here).
 *
 * Which retreats show is entirely AO-driven: is_public = true,
 * is_active = true, status = 'confirmed', start_date >= today. That
 * filter excludes AO's draft/deleted/test rows. To change the list, an
 * admin edits the retreat in AnamayaOS — there is no per-instance data.
 *
 * Silent on AO failure — if env vars are missing or the query fails it
 * renders an inline empty state rather than crashing the page.
 */
export default async function RetreatsCalendarBlock({
  content,
}: {
  content: RetreatsCalendarContent;
}) {
  const c = content ?? {};
  const heading = c.heading ?? "Upcoming Retreats";
  const subheading = c.subheading ?? "";
  const bookLabel = c.book_label ?? "Book This Retreat";
  const urlPattern = c.url_pattern || "/retreat/{slug}/";
  const maxCount = clamp(c.max_count ?? 100, 1, 200);
  const groupByMonth = c.group_by_month ?? true;
  const containerWidth = c.container_width_px ?? 1100;
  const padY = c.padding_y_px ?? 64;
  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color) ?? undefined;
  const headingColor = resolveBrandColor(c.heading_color) ?? undefined;
  const cardBg = resolveBrandColor(c.card_bg_color);
  const cardBorder = resolveBrandColor(c.card_border_color);
  const cardBorderWidth = clamp(c.card_border_width_px ?? 1, 0, 10);
  const cardRadius = clamp(c.card_corner_radius_px ?? 8, 0, 40);

  const retreats = await fetchUpcoming(maxCount);
  const groups = groupByMonth
    ? groupByMonthLabel(retreats)
    : [{ key: "all", label: "", items: retreats }];

  const cardStyle: React.CSSProperties = {
    borderWidth: cardBorderWidth,
    borderRadius: cardRadius,
    ...(cardBg ? { backgroundColor: cardBg } : null),
    ...(cardBorder ? { borderColor: cardBorder } : null),
  };

  return (
    <section
      className="relative w-full"
      style={{ backgroundColor: bg, color: textColor, paddingTop: padY, paddingBottom: padY }}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <header className="text-center">
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
      </div>

      {retreats.length === 0 ? (
        <div className="mx-auto mt-10 w-full px-6" style={{ maxWidth: containerWidth }}>
          <p className="rounded-md border border-dashed border-anamaya-charcoal/20 bg-white/40 p-8 text-center text-sm italic opacity-60">
            No upcoming retreats to show yet. Retreats appear here
            automatically once they&rsquo;re public and confirmed in
            AnamayaOS.
          </p>
        </div>
      ) : (
        <LayoutWidths content={c} defaultMaxContentPx={containerWidth} className="mt-10">
          <div className="flex flex-col gap-10">
            {groups.map((g) => (
              <div key={g.key}>
                {g.label && (
                  <h3
                    className="mb-4 border-b border-anamaya-mint/60 pb-2 font-heading text-xl font-semibold tracking-wide"
                    style={{ color: headingColor }}
                  >
                    {g.label}
                  </h3>
                )}
                <ul className="flex flex-col gap-5">
                  {g.items.map((r) => (
                    <CalendarRow
                      key={r.id}
                      r={r}
                      bookLabel={bookLabel}
                      urlPattern={urlPattern}
                      headingColor={headingColor}
                      cardStyle={cardStyle}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </LayoutWidths>
      )}
    </section>
  );
}

function CalendarRow({
  r,
  bookLabel,
  urlPattern,
  headingColor,
  cardStyle,
}: {
  r: AoRetreat;
  bookLabel: string;
  urlPattern: string;
  headingColor?: string;
  cardStyle: React.CSSProperties;
}) {
  const title = decodeEntities(r.name ?? "Untitled retreat");
  const dates = formatDateRange(r.start_date, r.end_date);
  const tagline = decodeEntities(stripHtml(r.tagline ?? r.excerpt ?? r.description ?? ""));
  const image = pickImage(r);
  // The retreat's own detail page — only exists when AO has a website_slug.
  // We do NOT fall back to the booking link here, so "More Info" always
  // means "see the details", never "go to Retreat Guru".
  const detailHref = r.website_slug ? urlPattern.replace(/\{slug\}/g, r.website_slug) : null;
  const bookHref = r.registration_link || r.external_link || null;
  const linkHref = detailHref ?? bookHref ?? "#";

  return (
    <li>
      <article
        className="grid grid-cols-1 gap-5 overflow-hidden border-solid border-anamaya-mint bg-white/40 sm:grid-cols-[220px_1fr]"
        style={cardStyle}
      >
        <a
          href={linkHref}
          className="group relative block h-44 overflow-hidden bg-anamaya-charcoal/5 sm:h-full"
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
          {r.is_sold_out && (
            <span className="absolute left-3 top-3 rounded-full bg-anamaya-charcoal/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              Sold out
            </span>
          )}
        </a>

        <div className="flex min-w-0 flex-col gap-2 p-5 sm:py-6 sm:pr-6">
          {dates && (
            <div className="text-sm font-semibold uppercase tracking-wider text-anamaya-green">
              {dates}
            </div>
          )}
          <a href={pageHref} className="block">
            <h4
              className="font-heading text-xl font-semibold leading-tight hover:opacity-80 sm:text-2xl"
              style={{ color: headingColor }}
            >
              {title}
            </h4>
          </a>
          {tagline && (
            <p className="line-clamp-2 text-[15px] leading-relaxed opacity-90">{tagline}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            {detailHref && (
              <a
                href={detailHref}
                className="inline-block rounded-full border border-anamaya-green px-5 py-2 text-xs font-semibold uppercase tracking-wider text-anamaya-green transition-colors hover:bg-anamaya-green hover:text-white"
              >
                More Info
              </a>
            )}
            {bookHref && (
              <a
                href={bookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full bg-anamaya-green px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
              >
                {r.is_sold_out ? "Join Waitlist" : bookLabel}
              </a>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Every upcoming, public, confirmed retreat in date order. Service-role
 * on AO is safe here — the query is locked to public+active+confirmed
 * rows and the key never reaches the browser.
 */
async function fetchUpcoming(limit: number): Promise<AoRetreat[]> {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await ao
    .from("retreats")
    .select(
      "id, name, excerpt, description, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link, tagline, is_sold_out, registration_status",
    )
    .eq("is_public", true)
    .eq("is_active", true)
    .eq("status", "confirmed")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AoRetreat[];
}

/** Group date-sorted retreats into month buckets ("August 2026"). */
function groupByMonthLabel(
  retreats: AoRetreat[],
): { key: string; label: string; items: AoRetreat[] }[] {
  const groups: { key: string; label: string; items: AoRetreat[] }[] = [];
  const index = new Map<string, number>();
  for (const r of retreats) {
    const iso = r.start_date;
    const d = iso ? new Date(iso) : null;
    const valid = d && !Number.isNaN(d.getTime());
    const key = valid ? `${d.getUTCFullYear()}-${d.getUTCMonth()}` : "tba";
    const label = valid
      ? d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      : "Dates to be announced";
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({ key, label, items: [] });
    }
    groups[index.get(key)!].items.push(r);
  }
  return groups;
}
