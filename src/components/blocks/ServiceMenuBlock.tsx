import type { ServiceMenuContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import LayoutWidths from "./shared/LayoutWidths";

/**
 * Service Menu block — async server component. Renders a categorized
 * service/price menu read LIVE from AnamayaOS, parameterized by a
 * `domain` (default "spa"), so the same block later powers cookbook /
 * excursions / biohacking by pointing it at a different domain.
 *
 * Reproduces the "Centered Ceremony" design from the
 * /spa-massage-costa-rica page: per-category ornate divider (alternating
 * red / green), a category title bookended by the sideways flower, then
 * treatment rows with name + description on the left and right-aligned
 * tiered prices.
 *
 * Data source: `service_catalog` (domain = content.domain, is_active =
 * true) grouped by the shared `spa_categories` table (label + order).
 * The block holds display settings only — never prices. To change the
 * menu, an admin edits the services in AnamayaOS.
 *
 * Silent on AO failure — if env vars are missing or the query fails it
 * renders an inline empty state rather than crashing the page.
 */

const FLOWER = "/journal/flower-sideways-right.webp";
const DIVIDER_RED = "/spa/divider-red.webp";
const DIVIDER_GREEN = "/spa/divider-green.webp";

type ServiceTier = {
  /** e.g. "60 min" (from duration_minutes). Empty when no duration. */
  label: string;
  /** Formatted price, e.g. "$80" or "Free". */
  price: string;
};

type ServiceTreatment = {
  key: string;
  name: string;
  description: string | null;
  isAddon: boolean;
  tiers: ServiceTier[];
};

type ServiceCategory = {
  id: string;
  name: string;
  treatments: ServiceTreatment[];
};

export default async function ServiceMenuBlock({
  content,
}: {
  content: ServiceMenuContent;
}) {
  const c = content ?? {};
  const domain = (c.domain ?? "spa").trim() || "spa";
  const heading = c.heading ?? "";
  const showDividers = c.show_dividers ?? true;
  const showFlowerTitles = c.show_flower_titles ?? true;
  const bookLabel = (c.book_label ?? "").trim();
  const bookHref = (c.book_href ?? "").trim();
  const containerWidth = c.container_width_px ?? 820;
  const padY = c.padding_y_px ?? 64;

  const bg = resolveBrandColor(c.bg_color) ?? "transparent";
  const textColor = resolveBrandColor(c.text_color);
  const headingColor = resolveBrandColor(c.heading_color);
  const priceColor = resolveBrandColor(c.price_color);

  const categories = await fetchServiceMenu(domain);

  // Inline overrides for the scoped CSS custom properties (each wins over
  // the default set in .svcmenu). Only set when the editor chose a colour.
  const rootStyle: Record<string, string | number> = {
    backgroundColor: bg,
    paddingTop: padY,
    paddingBottom: padY,
  };
  if (textColor) rootStyle["--svc-ink"] = textColor;
  if (headingColor) rootStyle["--svc-title"] = headingColor;
  if (priceColor) rootStyle["--svc-price"] = priceColor;

  return (
    <section className="svcmenu relative w-full" style={rootStyle as React.CSSProperties}>
      <style>{cssScoped}</style>

      {heading && (
        <div className="svc-headwrap">
          <h2 className="svc-heading">{heading}</h2>
        </div>
      )}

      {categories.length === 0 ? (
        <LayoutWidths content={c} defaultMaxContentPx={containerWidth}>
          <div className="svc-empty">
            <p>
              Our menu is being updated. Please check back soon for current
              services and pricing.
            </p>
          </div>
        </LayoutWidths>
      ) : (
        <LayoutWidths content={c} defaultMaxContentPx={containerWidth}>
          <div className="svc-wrap">
            {categories.map((cat, i) => (
              <CategoryBlock
                key={cat.id}
                cat={cat}
                index={i}
                showDivider={showDividers}
                showFlower={showFlowerTitles}
              />
            ))}
          </div>

          {bookLabel && bookHref && (
            <div className="svc-book">
              <a href={bookHref} target="_blank" rel="noopener noreferrer" className="svc-pill">
                {bookLabel}
              </a>
            </div>
          )}
        </LayoutWidths>
      )}
    </section>
  );
}

function Tiers({ tiers }: { tiers: ServiceTier[] }) {
  return (
    <div className="svc-price">
      {tiers.map((t, i) => (
        <span className="svc-ptier" key={`${t.label}-${t.price}-${i}`}>
          {t.label && <span className="svc-pdur">{t.label}</span>}
          <span className="svc-pamt">{t.price}</span>
        </span>
      ))}
    </div>
  );
}

/** Category title, optionally bookended by the sideways flower (left flipped). */
function CategoryTitle({ name, showFlower }: { name: string; showFlower: boolean }) {
  return (
    <div className="svc-ctitle">
      {showFlower && <span className="svc-fl svc-fl-l" aria-hidden />}
      <h2>{name}</h2>
      {showFlower && <span className="svc-fl svc-fl-r" aria-hidden />}
    </div>
  );
}

function CategoryBlock({
  cat,
  index,
  showDivider,
  showFlower,
}: {
  cat: ServiceCategory;
  index: number;
  showDivider: boolean;
  showFlower: boolean;
}) {
  // Alternate the ornate divider colour, red on even, green on odd.
  const divider = index % 2 === 0 ? DIVIDER_RED : DIVIDER_GREEN;
  return (
    <>
      {showDivider && (
        <div className="svc-orn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={divider} alt="" />
        </div>
      )}
      <section className="svc-cat">
        <CategoryTitle name={cat.name} showFlower={showFlower} />
        <div className="svc-rows">
          {cat.treatments.map((t) => (
            <div className="svc-row" key={t.key}>
              <div className="svc-main">
                <h3>{t.name}</h3>
                {t.description && <p>{t.description}</p>}
              </div>
              <Tiers tiers={t.tiers} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────

type AoCategoryRow = {
  id: string;
  name: string | null;
  sort_order: number | null;
};

type AoServiceRow = {
  id: string;
  category_id: string | null;
  slug: string | null;
  name: string | null;
  description: string | null;
  duration_minutes: number | null;
  price: number | null;
  currency: string | null;
  is_addon: boolean | null;
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

/** "60 min" from duration; blank when there's no duration on the row. */
function durationLabel(minutes: number | null): string {
  return minutes && minutes > 0 ? `${minutes} min` : "";
}

/** Trailing slug token used to disambiguate tiers that share a duration
 *  (e.g. relaxing-90-couple -> "couple"). */
function slugSuffix(slug: string | null): string {
  if (!slug) return "";
  const parts = slug.split("-").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/**
 * Fetch the live service menu for `domain`: categories in sort order,
 * each with its grouped treatments and tiers. Categories come from the
 * shared `spa_categories` table (id, name, sort_order); services from
 * `service_catalog` filtered to the domain + is_active. Degrades to an
 * empty array when AO env vars are missing or the query fails (the block
 * renders an empty state rather than crashing).
 *
 * Service-role on AO is safe here — server-only, read-only query, and
 * the key never reaches the browser.
 */
async function fetchServiceMenu(domain: string): Promise<ServiceCategory[]> {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];

  const [{ data: catData, error: catErr }, { data: svcData, error: svcErr }] =
    await Promise.all([
      ao
        .from("spa_categories")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
      ao
        .from("service_catalog")
        .select(
          "id, category_id, slug, name, description, duration_minutes, price, currency, is_addon, sort_order",
        )
        .eq("domain", domain)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (catErr || svcErr) return [];
  const categories = (catData ?? []) as AoCategoryRow[];
  const services = (svcData ?? []) as AoServiceRow[];

  // Group active services by (category_id, name), preserving the
  // sort_order sequence so treatments list in AO order.
  type Group = {
    key: string;
    name: string;
    description: string | null;
    isAddon: boolean;
    rows: AoServiceRow[];
  };
  const byCategory = new Map<string, Map<string, Group>>();

  for (const s of services) {
    const catId = s.category_id;
    const name = (s.name ?? "").trim();
    if (!catId || !name) continue;
    let groups = byCategory.get(catId);
    if (!groups) {
      groups = new Map<string, Group>();
      byCategory.set(catId, groups);
    }
    const groupKey = name.toLowerCase();
    let g = groups.get(groupKey);
    if (!g) {
      g = {
        key: `${catId}:${groupKey}`,
        name,
        description: s.description?.trim() || null,
        isAddon: s.is_addon ?? false,
        rows: [],
      };
      groups.set(groupKey, g);
    }
    if (!g.description && s.description?.trim()) g.description = s.description.trim();
    g.rows.push(s);
  }

  const result: ServiceCategory[] = [];
  for (const cat of categories) {
    const groups = byCategory.get(cat.id);
    if (!groups || groups.size === 0) continue; // skip empty categories

    const treatments: ServiceTreatment[] = [];
    for (const g of groups.values()) {
      // Order tiers by duration, then sort_order.
      const rows = [...g.rows].sort((a, b) => {
        const da = a.duration_minutes ?? 0;
        const db = b.duration_minutes ?? 0;
        if (da !== db) return da - db;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const tiers: ServiceTier[] = rows.map((r) => ({
        label: durationLabel(r.duration_minutes),
        price: formatPrice(r.price, r.currency),
      }));

      // Disambiguate tiers that share the same label using the slug tail.
      const labelCounts = new Map<string, number>();
      for (const t of tiers) labelCounts.set(t.label, (labelCounts.get(t.label) ?? 0) + 1);
      tiers.forEach((t, i) => {
        if ((labelCounts.get(t.label) ?? 0) > 1) {
          const suffix = slugSuffix(rows[i].slug);
          if (suffix) t.label = t.label ? `${t.label} · ${suffix}` : suffix;
        }
      });

      treatments.push({
        key: g.key,
        name: g.name,
        description: g.description,
        isAddon: g.isAddon,
        tiers,
      });
    }

    result.push({
      id: cat.id,
      name: (cat.name ?? "").trim() || "Services",
      treatments,
    });
  }

  return result;
}

// Bespoke "Centered Ceremony" styling, scoped under .svcmenu. Uses the
// site theme tokens (var(--color-anamaya-*), var(--font-heading)); the
// colourable roles are exposed as --svc-* custom properties so the editor
// can override them per-instance via inline style.
const cssScoped = `
.svcmenu {
  --svc-ink: var(--color-anamaya-charcoal);
  --svc-soft: color-mix(in srgb, var(--color-anamaya-charcoal) 72%, #ffffff);
  --svc-title: var(--color-anamaya-olive-dark);
  --svc-price: var(--color-anamaya-olive-dark);
  --svc-faint: var(--color-anamaya-teal-muted);
  --svc-line: color-mix(in srgb, var(--color-anamaya-mint) 65%, transparent);
  --svc-green: var(--color-anamaya-green);
  --svc-green-dark: var(--color-anamaya-green-dark);
  color: var(--svc-ink);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
.svcmenu img { display: block; max-width: 100%; }
.svcmenu a { text-decoration: none; }

/* Overall heading */
.svcmenu .svc-headwrap { text-align: center; margin-bottom: 8px; padding: 0 24px; }
.svcmenu .svc-heading { font-family: var(--font-heading); font-weight: 600; font-size: clamp(28px, 4vw, 44px); letter-spacing: .06em; text-transform: uppercase; color: var(--svc-title); margin: 0; }

/* Centered menu */
.svcmenu .svc-wrap { position: relative; }
.svcmenu .svc-cat { padding: 26px 0 8px; }
.svcmenu .svc-rows { display: flex; flex-direction: column; }
.svcmenu .svc-row { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: baseline; padding: 17px 0; border-bottom: 1px solid var(--svc-line); }
.svcmenu .svc-row h3 { font-family: var(--font-heading); font-weight: 600; font-size: 20px; color: var(--svc-ink); margin: 0 0 6px; letter-spacing: .01em; }
.svcmenu .svc-row p { font-size: 14px; line-height: 1.6; color: var(--svc-soft); margin: 0; max-width: 58ch; }
.svcmenu .svc-empty { text-align: center; padding: 60px 0; color: var(--svc-soft); font-style: italic; }

/* Price tiers */
.svcmenu .svc-price { display: flex; flex-direction: column; gap: 2px; text-align: right; min-width: 104px; }
.svcmenu .svc-ptier { display: flex; justify-content: flex-end; gap: 10px; font-variant-numeric: tabular-nums; }
.svcmenu .svc-pdur { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--svc-faint); align-self: center; }
.svcmenu .svc-pamt { font-family: var(--font-heading); font-weight: 600; font-size: 15px; color: var(--svc-price); }

/* Ornate divider + flower-bookended category title */
.svcmenu .svc-orn { display: flex; justify-content: center; padding: 6px 0; }
.svcmenu .svc-orn img { width: min(560px, 74%); height: auto; opacity: .92; }
.svcmenu .svc-ctitle { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 6px 0 20px; }
.svcmenu .svc-ctitle h2 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(24px, 3.2vw, 36px); letter-spacing: .08em; text-transform: uppercase; color: var(--svc-title); margin: 0; text-align: center; }
.svcmenu .svc-fl { flex: none; width: 36px; height: 32px; opacity: .5; background: url(${FLOWER}) center/contain no-repeat; }
.svcmenu .svc-fl-l { transform: scaleX(-1); }

/* Book pill */
.svcmenu .svc-book { text-align: center; margin-top: 34px; }
.svcmenu .svc-pill { display: inline-block; font-family: var(--font-heading); font-weight: 500; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; background: var(--svc-green); color: #fff; border-radius: 999px; padding: 13px 30px; transition: background .2s; }
.svcmenu .svc-pill:hover { background: var(--svc-green-dark); }

@media (max-width: 560px) {
  .svcmenu .svc-row { grid-template-columns: 1fr; gap: 8px; }
  .svcmenu .svc-row .svc-price { text-align: left; align-items: flex-start; min-width: 0; }
  .svcmenu .svc-row .svc-ptier { justify-content: flex-start; }
}
`;
