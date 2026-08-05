import "server-only";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

/**
 * Spa menu, read LIVE from AnamayOS (AO). Editing a treatment's price or
 * name in AnamayOS updates this page — nothing here is hard-coded.
 *
 * AO shape:
 *  - `spa_categories`  : id, slug, name, description, sort_order
 *  - `spa_services`    : id, category_id, slug, name, description,
 *                        duration_minutes, price, currency, is_addon,
 *                        is_active, sort_order
 *
 * Tiered treatments are stored as SEPARATE service rows that share the
 * same `name` (e.g. relaxing-60 / relaxing-75 / relaxing-90). We group
 * active services by (category_id, name) so each treatment shows once
 * with its list of tiers.
 *
 * Service-role on AO is safe here: this is a server-only module, the
 * query is read-only, and the key never reaches the browser.
 */

export type SpaTier = {
  /** e.g. "60 min" (from duration_minutes). Empty when no duration. */
  label: string;
  /** Formatted price, e.g. "$80" or "Free". */
  price: string;
};

export type SpaTreatment = {
  key: string;
  name: string;
  description: string | null;
  isAddon: boolean;
  tiers: SpaTier[];
};

export type SpaCategory = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  treatments: SpaTreatment[];
};

type AoCategoryRow = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
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
  is_active: boolean | null;
  sort_order: number | null;
};

/** "$80" for USD/blank currency; "Free" when null or 0; otherwise
 *  the currency code prefixes the amount (e.g. "CRC 45000"). */
function formatPrice(price: number | null, currency: string | null): string {
  if (price == null || price === 0) return "Free";
  const amount = Number.isInteger(price) ? String(price) : String(price);
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
 * Fetch the live spa menu: categories in sort order, each with its
 * grouped treatments and tiers. Degrades to an empty array when AO env
 * vars are missing or the query fails (page renders an empty state
 * rather than crashing).
 */
export async function getSpaMenu(): Promise<SpaCategory[]> {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];

  const [{ data: catData, error: catErr }, { data: svcData, error: svcErr }] =
    await Promise.all([
      ao
        .from("spa_categories")
        .select("id, slug, name, description, sort_order")
        .order("sort_order", { ascending: true }),
      ao
        .from("spa_services")
        .select(
          "id, category_id, slug, name, description, duration_minutes, price, currency, is_addon, is_active, sort_order",
        )
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
        // Description comes from the treatment's rows (first non-empty).
        description: s.description?.trim() || null,
        isAddon: s.is_addon ?? false,
        rows: [],
      };
      groups.set(groupKey, g);
    }
    if (!g.description && s.description?.trim()) g.description = s.description.trim();
    g.rows.push(s);
  }

  const result: SpaCategory[] = [];
  for (const cat of categories) {
    const groups = byCategory.get(cat.id);
    if (!groups || groups.size === 0) continue; // skip empty categories

    const treatments: SpaTreatment[] = [];
    for (const g of groups.values()) {
      // Order tiers by duration, then sort_order.
      const rows = [...g.rows].sort((a, b) => {
        const da = a.duration_minutes ?? 0;
        const db = b.duration_minutes ?? 0;
        if (da !== db) return da - db;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const tiers: SpaTier[] = rows.map((r) => ({
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
      slug: cat.slug,
      name: (cat.name ?? "").trim() || "Spa",
      description: cat.description?.trim() || null,
      treatments,
    });
  }

  return result;
}
