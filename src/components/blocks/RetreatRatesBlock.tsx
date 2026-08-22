import type { RetreatRatesContent, RetreatRateTier } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Resolved = {
  dates_text: string | null;
  tiers: RetreatRateTier[];
  spots_text: string | null;
  cta_label: string;
  cta_href: string | null;
};

function formatDateRange(startISO: string | null, endISO: string | null): string | null {
  if (!startISO) return null;
  const s = new Date(`${startISO.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(s.getTime())) return null;
  const sLabel = `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (!endISO) return `${sLabel}, ${s.getUTCFullYear()}`;
  const e = new Date(`${endISO.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(e.getTime())) return `${sLabel}, ${s.getUTCFullYear()}`;
  const eLabel =
    e.getUTCMonth() === s.getUTCMonth()
      ? `${e.getUTCDate()}`
      : `${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}`;
  return `${sLabel} – ${eLabel}, ${e.getUTCFullYear()}`;
}

function formatPrice(n: unknown, currency: string): string | null {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${Number.isInteger(num) ? num : num.toFixed(2)}`;
}

/**
 * Tiers from AO's `retreats.pricing_options` — an object keyed by lodging
 * id ({ "5": { name, price, ... } }), the field the booking calendar and
 * rest of the site already read live (unlike the near-empty
 * retreat_pricing_tiers table DetailsRatesDynamicBlock uses).
 */
function tiersFromPricingOptions(opts: unknown, currency: string): RetreatRateTier[] {
  const list = opts && typeof opts === "object" && !Array.isArray(opts) ? Object.values(opts) : [];
  const out: RetreatRateTier[] = [];
  for (const o of list) {
    const r = (o ?? {}) as Record<string, unknown>;
    const price = formatPrice(r.price ?? r.amount ?? r.rate ?? r.base_price, currency);
    const name = typeof r.name === "string" && r.name ? r.name : null;
    if (name && price) out.push({ name, price });
  }
  return out;
}

async function resolveLive(retreatId: string | undefined): Promise<Resolved | null> {
  const id = retreatId?.trim();
  if (!id || !UUID_RE.test(id)) return null;
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return null;

  const { data, error } = await ao
    .from("retreats")
    .select(
      "start_date, end_date, pricing_options, available_spaces, is_sold_out, registration_status, registration_link, external_link, currency",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const currency = (data.currency as string | null) ?? "USD";
  const tiers = tiersFromPricingOptions(data.pricing_options, currency);
  const spaces = data.available_spaces;
  const spots_text =
    typeof spaces === "number" && spaces > 0 && spaces <= 8
      ? `Only ${spaces} ${spaces === 1 ? "spot" : "spots"} left`
      : null;

  const soldOut = Boolean(data.is_sold_out);
  const isExternal = data.registration_status === "external";
  const cta_href =
    (data.registration_link as string | null) || (data.external_link as string | null) || null;
  const cta_label = soldOut ? "Join Waitlist" : isExternal ? "Enquire" : "Book Now";

  return {
    dates_text: formatDateRange(data.start_date as string | null, data.end_date as string | null),
    tiers,
    spots_text,
    cta_label,
    cta_href,
  };
}

/**
 * Retreat Overview & Rates — horizontal block for a retreat template's
 * main column, typically placed right under the hero. Dates, per-room
 * pricing, spots-left, and the Book/Enquire button, pulled live from
 * AnamayOS when `retreat_id` resolves; otherwise the manual fields
 * (pre-filled from the scraped legacy page at conversion time).
 */
export default async function RetreatRatesBlock({ content }: { content: RetreatRatesContent }) {
  const c = content ?? {};
  const live = await resolveLive(c.retreat_id);

  const dates_text = live?.dates_text || c.manual_dates_text || null;
  const tiers = live?.tiers?.length ? live.tiers : c.manual_tiers ?? [];
  const spots_text = live?.spots_text || c.manual_spots_text || null;
  const cta_label = live?.cta_label || c.manual_cta_label || "Book Now";
  const cta_href = live?.cta_href || c.manual_cta_href || null;

  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const text = resolveBrandColor(c.text_color) ?? undefined;
  const maxW = c.container_width_px ?? 1200;
  const padY = c.padding_y_px ?? 32;

  if (!dates_text && tiers.length === 0 && !cta_href) return null;

  return (
    <section style={{ backgroundColor: bg, color: text, paddingTop: padY, paddingBottom: padY }}>
      <div className="mx-auto w-full px-4" style={{ maxWidth: maxW }}>
        <div className="flex flex-col gap-6 rounded-2xl border border-anamaya-mint/60 bg-white/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {c.heading && (
              <h3 className="font-heading text-lg font-semibold text-anamaya-charcoal">
                {c.heading}
              </h3>
            )}
            {dates_text && (
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                {dates_text}
              </p>
            )}
            {spots_text && (
              <p className="mt-1 text-sm font-semibold text-anamaya-terracotta">{spots_text}</p>
            )}
          </div>

          {tiers.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="text-right">
                  <div className="text-xs uppercase tracking-wider text-anamaya-charcoal/50">
                    {t.name}
                  </div>
                  <div className="font-heading text-xl font-semibold text-anamaya-green">
                    {t.price}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cta_href && (
            <a
              href={cta_href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-anamaya-green px-6 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
            >
              {cta_label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
