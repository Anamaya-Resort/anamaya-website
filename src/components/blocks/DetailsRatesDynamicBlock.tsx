import type { DetailsRatesDynamicContent, PricingTier } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseOrNull } from "@/lib/ao-supabase";
import CtaButton from "./shared/CtaButton";
import DecorationOverlay from "./shared/DecorationOverlay";

/**
 * Two-column "Retreat Details + Rates" section. Right-side rates pull
 * live from AnamayOS so the price sheet stays in sync; falls back to
 * editor-supplied tiers when AO is unreachable, returns nothing, or
 * no retreat is set. Async server component — the AO read happens at
 * request time on the server.
 */
export default async function DetailsRatesDynamicBlock({
  content,
}: {
  content: DetailsRatesDynamicContent;
}) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color) ?? undefined;
  const padY = content?.padding_y_px ?? 64;
  const gap = content?.gap_px ?? 48;
  const containerWidth = content?.container_width_px ?? 1200;
  const leftPct = Math.max(20, Math.min(80, content?.left_width_pct ?? 55));
  const rightPct = 100 - leftPct;
  const valign = content?.vertical_align ?? "top";
  const alignItems =
    valign === "center" ? "center" : valign === "bottom" ? "end" : "start";

  const tiers = await resolveTiers(content);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: bg, color, paddingTop: padY, paddingBottom: padY }}
    >
      <DecorationOverlay frame={content} />
      <div className="relative mx-auto w-full px-6" style={{ maxWidth: containerWidth }}>
        <div
          className="grid grid-cols-1 md:grid-cols-[var(--cols)]"
          style={
            {
              ["--cols" as string]: `${leftPct}fr ${rightPct}fr`,
              alignItems,
              gap,
            } as React.CSSProperties
          }
        >
          <div className="min-w-0">
            {content?.heading_left && (
              <h2 className="mb-4 font-heading text-3xl">{content.heading_left}</h2>
            )}
            {content?.html_left && (
              <div
                className="prose max-w-none [&_p]:my-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: content.html_left }}
              />
            )}
          </div>
          <div className="min-w-0">
            {content?.heading_right && (
              <h2 className="mb-4 font-heading text-3xl">{content.heading_right}</h2>
            )}
            <TierList tiers={tiers} />
            {content?.pricing_note && (
              <p className="mt-4 text-sm opacity-70">{content.pricing_note}</p>
            )}
          </div>
        </div>
        <CtaButton cta={content ?? {}} />
      </div>
    </section>
  );
}

/** Stacked rows — denser than PricingTableBlock so the list fits in a column. */
function TierList({ tiers }: { tiers: PricingTier[] }) {
  if (tiers.length === 0) {
    return <p className="text-sm opacity-60">Pricing coming soon.</p>;
  }
  return (
    <ul className="divide-y divide-anamaya-mint/60 rounded-lg border border-anamaya-mint bg-white/40">
      {tiers.map((tier, i) => (
        <li
          key={i}
          className={`flex items-baseline justify-between gap-4 p-4 ${
            tier.highlight ? "bg-anamaya-green/5" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="font-heading text-lg leading-tight">{tier.name}</div>
            {tier.note && <div className="mt-1 text-xs opacity-70">{tier.note}</div>}
          </div>
          {tier.price && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-xl font-semibold">{tier.price}</div>
              {tier.currency && (
                <div className="text-[10px] uppercase tracking-wider opacity-60">
                  {tier.currency}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve which tier list to render: AO live data when retreat_id is set
 * and the query succeeds with rows, manual_tiers otherwise. Failures here
 * are silent on purpose — the block falls back rather than blocking the
 * page render on a transient AO outage.
 */
async function resolveTiers(content: DetailsRatesDynamicContent): Promise<PricingTier[]> {
  const manual = (content?.manual_tiers ?? []).filter((t) => t?.name);
  const id = content?.retreat_id?.trim();
  if (!id || !UUID_RE.test(id)) return manual;

  const ao = aoSupabaseOrNull();
  if (!ao) return manual;

  const { data, error } = await ao
    .from("retreat_pricing_tiers")
    .select("name, price, currency, description, tier_order, spaces_total, spaces_sold, cutoff_date, is_active")
    .eq("retreat_id", id)
    .eq("is_active", true)
    .order("tier_order", { ascending: true });

  if (error || !data || data.length === 0) return manual;

  return data.map((row) => {
    const price = typeof row.price === "number" ? row.price : Number(row.price);
    const remaining = computeRemaining(row.spaces_total, row.spaces_sold);
    const soldOut = remaining === 0;
    const noteParts: string[] = [];
    if (row.description) noteParts.push(String(row.description));
    if (row.cutoff_date) noteParts.push(`Until ${formatDate(row.cutoff_date)}`);
    if (remaining != null && remaining > 0 && remaining <= 5) {
      noteParts.push(`${remaining} ${remaining === 1 ? "spot" : "spots"} left`);
    }
    return {
      name: String(row.name),
      price: soldOut ? "Sold out" : formatPrice(price, row.currency),
      currency: soldOut ? undefined : (row.currency as string | undefined) ?? undefined,
      note: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
      highlight: false,
    } satisfies PricingTier;
  });
}

function computeRemaining(total: unknown, sold: unknown): number | null {
  const t = typeof total === "number" ? total : total != null ? Number(total) : null;
  const s = typeof sold === "number" ? sold : sold != null ? Number(sold) : 0;
  if (t == null || !Number.isFinite(t)) return null;
  return Math.max(0, t - (Number.isFinite(s) ? s : 0));
}

function formatPrice(price: number, currency: unknown): string {
  if (!Number.isFinite(price)) return "—";
  const cur = typeof currency === "string" && currency ? currency : "USD";
  const symbol = cur === "USD" ? "$" : "";
  const rounded = Number.isInteger(price) ? price.toString() : price.toFixed(2);
  return `${symbol}${rounded}`;
}

function formatDate(iso: unknown): string {
  if (typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
