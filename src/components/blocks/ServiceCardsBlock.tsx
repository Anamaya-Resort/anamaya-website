import type { ServiceCardsContent, ServiceCardItem } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import LayoutWidths from "./shared/LayoutWidths";

/**
 * Service Cards block — async server component. An "advanced" service list
 * where each service is a CARD: name, price, a one-line blurb, a native
 * <details> "More info" accordion (longer description + optional route/time
 * rows + a link), and a RIGHT-SIDE 3:2 image. When a service has NO image,
 * the card renders full-width text — never an empty image box.
 *
 * DUAL-MODE, mirroring ServiceMenuBlock (AO by domain) +
 * DetailsRatesDynamicBlock (AO OR manual fallback):
 *   - When `content.domain` is set, it reads live from AnamayaOS
 *     `service_catalog` (domain + is_active), mapping each row to a card.
 *   - Otherwise, or when the AO query errors / returns nothing, it degrades
 *     silently to the manual `content.items` list stored on the block.
 *
 * The card design reproduces the travel-page ".svc" card look using the site
 * theme tokens (var(--color-anamaya-*), var(--font-heading)); the CSS is
 * scoped under .svccards. All service text is treated as untrusted — it is
 * rendered as escaped React children, never via dangerouslySetInnerHTML.
 *
 * Silent-degrade: renders nothing when neither AO nor items yield a service.
 */

const FLOWER = "/journal/flower-sideways-right.webp";
const DIVIDER_RED = "/spa/divider-red.webp";

type ServiceCard = {
  key: string;
  name: string;
  price: string;
  blurb: string;
  description: string;
  imageUrl: string;
  route: string;
  duration: string;
  linkLabel: string;
  linkHref: string;
};

export default async function ServiceCardsBlock({
  content,
}: {
  content: ServiceCardsContent;
}) {
  const c = content ?? {};
  const domain = (c.domain ?? "").trim();
  const heading = (c.heading ?? "").trim();
  const showDivider = c.show_divider ?? true;
  const containerWidth = c.container_width_px ?? 760;
  const padY = c.padding_y_px ?? 64;

  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color);
  const headingColor = resolveBrandColor(c.heading_color);

  const cards = await resolveCards(c, domain);

  // Nothing to show from either source: degrade silently to nothing so the
  // block never leaves an empty shell on the page.
  if (cards.length === 0) return null;

  const rootStyle: Record<string, string | number> = {
    backgroundColor: bg,
    paddingTop: padY,
    paddingBottom: padY,
  };
  if (textColor) rootStyle["--svcc-ink"] = textColor;
  if (headingColor) rootStyle["--svcc-title"] = headingColor;

  return (
    <section className="svccards relative w-full" style={rootStyle as React.CSSProperties}>
      <style>{cssScoped}</style>

      <LayoutWidths content={c} defaultMaxContentPx={containerWidth}>
        {heading && (
          <div className="svcc-headwrap">
            {showDivider && (
              <div className="svcc-orn-top" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="svcc-orn" src={DIVIDER_RED} alt="" />
              </div>
            )}
            <h2 className="svcc-heading">{heading}</h2>
          </div>
        )}

        <div className="svcc-list">
          {cards.map((s) => (
            <Card key={s.key} card={s} />
          ))}
        </div>
      </LayoutWidths>
    </section>
  );
}

function Card({ card }: { card: ServiceCard }) {
  const hasImg = card.imageUrl.length > 0;
  const meta: React.ReactNode[] = [];
  if (card.route) {
    meta.push(
      <div className="mrow" key="route">
        <span>Route</span>
        {card.route}
      </div>,
    );
  }
  if (card.duration) {
    meta.push(
      <div className="mrow" key="time">
        <span>Time</span>
        {card.duration}
      </div>,
    );
  }

  const hasMore =
    card.description.length > 0 || meta.length > 0 || (card.linkLabel.length > 0 && card.linkHref.length > 0);

  return (
    <article className={`svc ${hasImg ? "has-img" : "no-img"}`}>
      <div className="svc-body">
        <h3 className="svc-name">{card.name}</h3>
        <div className="svc-price">{card.price || "Enquire"}</div>
        {card.blurb && <p className="svc-blurb">{card.blurb}</p>}

        {hasMore && (
          <details className="more">
            <summary>
              <span className="mtxt">More info</span>
              <span className="mcar">&#9662;</span>
            </summary>
            <div className="more-in">
              {card.description && <p>{card.description}</p>}
              {meta}
              {card.linkLabel && card.linkHref && (
                <a className="mlink" href={card.linkHref} target="_blank" rel="noopener noreferrer">
                  {card.linkLabel} &rarr;
                </a>
              )}
            </div>
          </details>
        )}
      </div>

      {hasImg && (
        <div className="svc-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" alt={card.name} src={card.imageUrl} />
        </div>
      )}
    </article>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────

type AoServiceRow = {
  id: string;
  name: string | null;
  price: number | null;
  currency: string | null;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  sort_order: number | null;
};

/** "$80" for USD/blank currency; "Free" when null or 0; otherwise the
 *  currency code prefixes the amount (e.g. "CRC 45000"). */
function formatPrice(price: number | null, currency: string | null): string {
  if (price == null || price === 0) return "Free";
  const amount = String(price);
  const code = (currency ?? "").trim().toUpperCase();
  if (code === "" || code === "USD" || code === "$") return `$${amount}`;
  return `${code} ${amount}`;
}

/** Normalize a manual item into a ServiceCard, trimming all text fields. */
function fromItem(item: ServiceCardItem, i: number): ServiceCard | null {
  const name = (item?.name ?? "").trim();
  if (!name) return null;
  return {
    key: `item-${i}`,
    name,
    price: (item?.price ?? "").trim(),
    blurb: (item?.blurb ?? "").trim(),
    description: (item?.description ?? "").trim(),
    imageUrl: (item?.image_url ?? "").trim(),
    route: (item?.route ?? "").trim(),
    duration: (item?.duration ?? "").trim(),
    linkLabel: (item?.link_label ?? "").trim(),
    linkHref: (item?.link_href ?? "").trim(),
  };
}

/** The manual card list, filtered to cards that have a name. */
function manualCards(content: ServiceCardsContent): ServiceCard[] {
  return (content?.items ?? [])
    .map((it, i) => fromItem(it, i))
    .filter((c): c is ServiceCard => c !== null);
}

/**
 * Resolve which cards to render:
 *   - If `domain` is set, read AnamayaOS service_catalog (domain +
 *     is_active), SELECTing the future columns short_description / image_url
 *     / external_url as well. If the AO client is unavailable, the query
 *     ERRORS (e.g. those columns don't exist yet), or it returns no rows,
 *     DEGRADE to the manual items — never throw.
 *   - Otherwise render the manual items.
 *
 * Service-role on AO is safe here — server-only, read-only query, and the
 * key never reaches the browser.
 */
async function resolveCards(
  content: ServiceCardsContent,
  domain: string,
): Promise<ServiceCard[]> {
  const manual = manualCards(content);
  if (!domain) return manual;

  const ao = aoSupabaseAdminOrNull();
  if (!ao) return manual;

  const { data, error } = await ao
    .from("service_catalog")
    .select(
      "id, name, price, currency, short_description, description, image_url, external_url, sort_order",
    )
    .eq("domain", domain)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Any AO failure (missing columns → error, or an empty result) falls back
  // to the manual list rather than crashing or rendering nothing.
  if (error || !data || data.length === 0) return manual;

  const cards = (data as AoServiceRow[])
    .map((row): ServiceCard | null => {
      const name = (row.name ?? "").trim();
      if (!name) return null;
      return {
        key: row.id,
        name,
        price: formatPrice(row.price, row.currency),
        blurb: (row.short_description ?? "").trim(),
        description: (row.description ?? "").trim(),
        imageUrl: (row.image_url ?? "").trim(),
        route: "",
        duration: "",
        linkLabel: (row.external_url ?? "").trim() ? "Learn more" : "",
        linkHref: (row.external_url ?? "").trim(),
      };
    })
    .filter((c): c is ServiceCard => c !== null);

  return cards.length > 0 ? cards : manual;
}

// Bespoke ".svc" card styling, scoped under .svccards. Reproduces the
// travel-page card design (name / price / blurb / <details> "More info" /
// route+time rows / right-side 3:2 image) using the site theme tokens. The
// colourable roles are exposed as --svcc-* custom properties so the editor
// can override them per-instance via inline style.
const cssScoped = `
.svccards {
  --svcc-ink: var(--color-anamaya-charcoal);
  --svcc-soft: color-mix(in srgb, var(--color-anamaya-charcoal) 72%, #ffffff);
  --svcc-faint: var(--color-anamaya-teal-muted);
  --svcc-title: var(--color-anamaya-olive-dark);
  --svcc-price: var(--color-anamaya-olive-dark);
  --svcc-accent: var(--color-anamaya-accent);
  --svcc-green-dark: var(--color-anamaya-green-dark);
  --svcc-teal-muted: var(--color-anamaya-teal-muted);
  --svcc-line: color-mix(in srgb, var(--color-anamaya-mint) 60%, transparent);
  --svcc-paper: #ffffff;
  color: var(--svcc-ink);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
.svccards img { display: block; max-width: 100%; }
.svccards a { text-decoration: none; }

/* Overall heading + optional divider */
.svccards .svcc-headwrap { text-align: center; margin-bottom: 22px; padding: 0 24px; }
.svccards .svcc-heading { font-family: var(--font-heading); font-weight: 600; font-size: clamp(28px, 4vw, 44px); letter-spacing: .06em; text-transform: uppercase; color: var(--svcc-title); margin: 0; }
.svccards .svcc-orn-top { display: flex; justify-content: center; margin: 0 0 24px; }
.svccards .svcc-orn { width: min(420px, 62%); height: auto; opacity: .92; }
.svccards .svcc-fl { flex: none; width: 30px; height: 26px; opacity: .5; background: url(${FLOWER}) center/contain no-repeat; }
.svccards .svcc-fl-l { transform: scaleX(-1); }

/* Cards */
.svccards .svcc-list { display: flex; flex-direction: column; }
.svccards .svc { display: grid; grid-template-columns: 1fr; gap: 26px; align-items: center; background: var(--svcc-paper); border: 1px solid var(--svcc-line); border-radius: 15px; padding: 24px 26px; margin-bottom: 18px; transition: border-color .2s; }
.svccards .svc:hover { border-color: var(--svcc-teal-muted); }
.svccards .svc.has-img { grid-template-columns: 1fr 340px; }
.svccards .svc-body { min-width: 0; }
.svccards .svc-name { font-family: var(--font-heading); font-weight: 600; font-size: 23px; letter-spacing: .01em; color: var(--svcc-ink); margin: 0 0 6px; }
.svccards .svc-price { font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: .02em; color: var(--svcc-price); margin: 0 0 10px; }
.svccards .svc-blurb { color: var(--svcc-soft); font-size: 15.5px; line-height: 1.6; margin: 0 0 12px; }

/* 3:2 image column */
.svccards .svc-img { aspect-ratio: 3 / 2; border-radius: 11px; overflow: hidden; background: #eef1ec; }
.svccards .svc-img img { width: 100%; height: 100%; object-fit: cover; }

/* "More info" accordion */
.svccards details.more { border-top: 1px solid var(--svcc-line); padding-top: 10px; }
.svccards details.more > summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-heading); font-weight: 500; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: var(--svcc-green-dark); }
.svccards details.more > summary::-webkit-details-marker { display: none; }
.svccards .mcar { transition: transform .2s; font-size: 11px; }
.svccards details.more[open] .mcar { transform: rotate(180deg); }
.svccards .more-in { margin-top: 12px; color: var(--svcc-soft); font-size: 14.5px; line-height: 1.66; }
.svccards .more-in p { margin: 0 0 12px; }
.svccards .mrow { display: flex; gap: 10px; font-size: 13px; padding: 4px 0; border-top: 1px dashed var(--svcc-line); }
.svccards .mrow span { font-family: var(--font-heading); font-weight: 500; text-transform: uppercase; letter-spacing: .1em; font-size: 11px; color: var(--svcc-faint); min-width: 52px; padding-top: 1px; }
.svccards .mlink { display: inline-block; margin-top: 12px; font-family: var(--font-heading); font-weight: 500; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--svcc-accent); }

@media (max-width: 680px) {
  .svccards .svc.has-img { grid-template-columns: 1fr; }
}
`;
