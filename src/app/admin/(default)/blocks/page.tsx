import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createBlock } from "./actions";
import BlockCard from "./BlockCard";
import { HorizontalIcon, VerticalIcon, FloatingIcon, ShapeBadge } from "@/components/admin/blocks/ShapeIcon";

type Shape = "horizontal" | "vertical" | "floating";

// The stored value stays "horizontal"/"vertical"/"floating"; these are the
// user-facing "Block Area" labels. See docs/BLOCK_AREA_NOMENCLATURE.md for the
// plan to rename the underlying data/code names to match.
const SHAPE_LABELS: Record<Shape, string> = {
  horizontal: "Standard Blocks",
  vertical: "Side Blocks",
  floating: "Floating Blocks",
};

export const dynamic = "force-dynamic";

type Category =
  | "ui"
  | "video"
  | "image"
  | "2-column"
  | "rich-text"
  | "grid"
  | "gallery"
  | "signup"
  | "table";

const ALL_CATEGORIES: Category[] = [
  "ui",
  "video",
  "image",
  "2-column",
  "rich-text",
  "grid",
  "gallery",
  "signup",
  "table",
];

const BLOCK_CATEGORIES: Record<string, Category[]> = {
  rich_text: ["rich-text"],
  rich_bg: ["rich-text", "image"],
  raw_html: ["rich-text"],
  hero: ["image", "video"],
  cta_banner: ["image", "rich-text"],
  press_bar: ["image"],
  image_overlay: ["image", "rich-text"],
  image_text: ["image", "rich-text", "2-column"],
  divider: ["image"],
  quote: ["rich-text", "image"],
  person_card: ["image", "rich-text"],
  video_showcase: ["video"],
  gallery: ["gallery", "image"],
  newsletter: ["signup"],
  pricing_table: ["table"],
  date_range: ["table"],
  feature_list: ["grid"],
  checklist: ["grid", "rich-text"],
  two_column: ["2-column"],
  three_column: ["2-column", "image", "rich-text"],
  ui_top: ["ui"],
  ui_side_menu_right: ["ui"],
  ui_agent: ["ui"],
  ui_footer_main: ["ui"],
  ui_footer_legal: ["ui"],
  featured_retreats: ["grid", "image"],
  small_form_over_image: ["signup", "image"],
  google_map_with_text: ["2-column", "rich-text"],
  testimonials: ["rich-text", "image"],
  image_slideshow: ["image", "rich-text"],
};

const CATEGORY_COLORS: Record<Category, string> = {
  ui: "bg-zinc-200 text-zinc-900 ring-zinc-300 hover:bg-zinc-300",
  video: "bg-rose-100 text-rose-800 ring-rose-200 hover:bg-rose-200",
  image: "bg-amber-100 text-amber-800 ring-amber-200 hover:bg-amber-200",
  "2-column": "bg-violet-100 text-violet-800 ring-violet-200 hover:bg-violet-200",
  "rich-text": "bg-sky-100 text-sky-800 ring-sky-200 hover:bg-sky-200",
  grid: "bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200",
  gallery: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200 hover:bg-fuchsia-200",
  signup: "bg-teal-100 text-teal-800 ring-teal-200 hover:bg-teal-200",
  table: "bg-orange-100 text-orange-800 ring-orange-200 hover:bg-orange-200",
};

const CATEGORY_COLORS_ACTIVE: Record<Category, string> = {
  ui: "bg-anamaya-charcoal text-white ring-black hover:bg-black",
  video: "bg-rose-600 text-white ring-rose-700 hover:bg-rose-700",
  image: "bg-amber-600 text-white ring-amber-700 hover:bg-amber-700",
  "2-column": "bg-violet-600 text-white ring-violet-700 hover:bg-violet-700",
  "rich-text": "bg-sky-600 text-white ring-sky-700 hover:bg-sky-700",
  grid: "bg-emerald-600 text-white ring-emerald-700 hover:bg-emerald-700",
  gallery: "bg-fuchsia-600 text-white ring-fuchsia-700 hover:bg-fuchsia-700",
  signup: "bg-teal-600 text-white ring-teal-700 hover:bg-teal-700",
  table: "bg-orange-600 text-white ring-orange-700 hover:bg-orange-700",
};

function CategoryTag({ cat, active, href }: { cat: Category; active: boolean; href: string }) {
  const cls = active ? CATEGORY_COLORS_ACTIVE[cat] : CATEGORY_COLORS[cat];
  return (
    <Link
      href={href}
      title={active ? `Clear filter (${cat})` : `Filter by ${cat}`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${cls}`}
    >
      {cat}
    </Link>
  );
}

/** Which section a block type sits in on the block maker, by page position:
 *  Header (top bar + hero), Footer (the UI footers), Body for everything else.
 *  (This is separate from "Block Area" = Standard/Side/Floating, the filter.) */
function sectionOf(slug: string): "header" | "body" | "footer" {
  if (slug.startsWith("ui_footer")) return "footer";
  if (slug === "ui_top" || slug === "hero") return "header";
  return "body";
}

export default async function BlocksIndex({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; shape?: string }>;
}) {
  const { tag, shape } = await searchParams;
  const selectedTag = (ALL_CATEGORIES as string[]).includes(tag ?? "")
    ? (tag as Category)
    : null;
  const selectedShape: Shape | null =
    shape === "horizontal" || shape === "vertical" || shape === "floating"
      ? shape
      : null;
  // Build a /admin/blocks href with the tag/shape filters combined, so
  // toggling one preserves the other. Pass null to clear a filter.
  function withParams(next: { tag?: Category | null; shape?: Shape | null }): string {
    const t = next.tag !== undefined ? next.tag : selectedTag;
    const s = next.shape !== undefined ? next.shape : selectedShape;
    const p = new URLSearchParams();
    if (t) p.set("tag", t);
    if (s) p.set("shape", s);
    const qs = p.toString();
    return qs ? `/admin/blocks?${qs}` : "/admin/blocks";
  }
  const sb = supabaseServer();
  // Defensive: if migration 0008 hasn't been applied yet, the `slug`
  // column won't exist and the list page would come up empty. Try the
  // new query first, fall back to the old one with a synthetic slug.
  async function fetchBlocks() {
    const withSlug = await sb
      .from("blocks")
      .select("id, type_slug, name, slug, snapshot_url, updated_at")
      .order("name");
    if (!withSlug.error) return withSlug.data ?? [];
    const fb = await sb
      .from("blocks")
      .select("id, type_slug, name, snapshot_url, updated_at")
      .order("name");
    return (fb.data ?? []).map((b) => ({ ...b, slug: `${b.type_slug}_?` }));
  }
  // Defensive: 0025 added is_overlay/is_active/sort_order. On older
  // databases those columns are missing — fall back to the legacy shape
  // and synthesize default values so the page still renders.
  async function fetchTypes() {
    const withOverlay = await sb
      .from("block_types")
      .select("slug, name, description, is_overlay, is_active, sort_order, shape")
      .order("sort_order")
      .order("name");
    if (!withOverlay.error) {
      return (withOverlay.data ?? []).filter(
        (t) => (t as { is_active?: boolean }).is_active !== false,
      );
    }
    const fb = await sb.from("block_types").select("slug, name, description").order("name");
    return (fb.data ?? []).map((t) => ({
      ...t,
      is_overlay: false,
      is_active: true,
      sort_order: 100,
      shape: "horizontal",
    }));
  }
  const [types, blocks] = await Promise.all([fetchTypes(), fetchBlocks()]);

  const byType = new Map<string, (typeof blocks)[number][]>();
  for (const b of blocks) {
    const arr = byType.get(b.type_slug) ?? [];
    arr.push(b);
    byType.set(b.type_slug, arr);
  }

  const visibleTypes = types.filter((t) => {
    if (selectedTag && !(BLOCK_CATEGORIES[t.slug] ?? []).includes(selectedTag)) return false;
    if (selectedShape && ((t as { shape?: string }).shape ?? "horizontal") !== selectedShape)
      return false;
    return true;
  });

  // Group into Header / Body / Footer, alphabetised by name within each.
  const bySection = (s: "header" | "body" | "footer") =>
    visibleTypes
      .filter((t) => sectionOf(t.slug) === s)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  const groups: {
    key: "header" | "body" | "footer";
    label: string;
    types: typeof visibleTypes;
  }[] = [
    { key: "header", label: "Header Blocks", types: bySection("header") },
    { key: "body", label: "Body Blocks", types: bySection("body") },
    { key: "footer", label: "Footer Blocks", types: bySection("footer") },
  ];

  return (
    <div className="mx-[calc(50%-50vw)] w-screen space-y-8 px-8">
      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT — intro (stacks above Block Search on narrow screens) */}
          <div>
            <h1 className="text-3xl font-semibold text-anamaya-charcoal">Blocks</h1>
            <p className="mt-2 text-base text-anamaya-charcoal/70">
              Reusable content blocks are the building pieces of every page. Edit a block once and
              your changes flow through to every page that uses it. Create multiple blocks of the
              same type when you need different variants for different pages.
            </p>
            {blocks.filter((b) => !b.snapshot_url).length > 0 && (
              <Link
                href="/admin/blocks/backfill-snapshots"
                className="mt-3 inline-block text-sm font-semibold text-[#2271b1] hover:underline"
              >
                Generate {blocks.filter((b) => !b.snapshot_url).length} missing previews →
              </Link>
            )}
          </div>

          {/* RIGHT — Block Search */}
          <div className="md:border-l md:border-zinc-200 md:pl-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/70">
              Block Search
            </h2>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/50">
                Block Area
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["horizontal", "vertical", "floating"] as Shape[]).map((sh) => {
                  const active = selectedShape === sh;
                  const label = SHAPE_LABELS[sh];
                  const Icon =
                    sh === "vertical"
                      ? VerticalIcon
                      : sh === "floating"
                        ? FloatingIcon
                        : HorizontalIcon;
                  return (
                    <Link
                      key={sh}
                      href={withParams({ shape: active ? null : sh })}
                      title={active ? `Clear ${label} filter` : `Show ${label}`}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset transition-colors ${
                        active
                          ? "bg-anamaya-charcoal text-white ring-black"
                          : "bg-white text-anamaya-charcoal/70 ring-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/50">
                Block Type
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ALL_CATEGORIES.map((c) => (
                  <CategoryTag
                    key={c}
                    cat={c}
                    active={selectedTag === c}
                    href={withParams({ tag: selectedTag === c ? null : c })}
                  />
                ))}
              </div>
            </div>

            {(selectedTag || selectedShape) && (
              <Link
                href="/admin/blocks"
                className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60 underline hover:text-anamaya-charcoal"
              >
                Clear all filters
              </Link>
            )}
          </div>
        </div>
      </section>

      {(selectedTag || selectedShape) && visibleTypes.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm italic text-anamaya-charcoal/60">
          No block types match the current filters.{" "}
          <Link href="/admin/blocks" className="underline hover:text-anamaya-charcoal">
            Show all
          </Link>
          .
        </div>
      )}

      {groups.map((g) => {
        if (g.types.length === 0) return null;
        return (
          <div key={g.key} className="space-y-8">
            <div className="rounded-lg bg-anamaya-charcoal px-6 py-2.5 shadow-sm">
              <h2 className="text-[26px] font-bold uppercase tracking-wide text-white">
                {g.label}
              </h2>
            </div>
            {g.types.map((t) => {
              async function newBlock() {
                "use server";
                const id = await createBlock(t.slug, `New ${t.name}`);
                redirect(`/admin/blocks/${id}`);
              }

              const cats = BLOCK_CATEGORIES[t.slug] ?? [];
              const items = byType.get(t.slug) ?? [];

              return (
                <section key={t.slug} className="space-y-4">
            <header className="flex flex-col gap-3 rounded-lg bg-[#e8e0da] p-5 shadow-sm ring-1 ring-zinc-200 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-anamaya-charcoal">{t.name}</h2>
                  <ShapeBadge shape={(t as { shape?: string }).shape} />
                </div>
                {t.description && (
                  <p className="mt-1 text-sm text-anamaya-charcoal/60">{t.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {cats.map((c) => (
                  <CategoryTag
                    key={c}
                    cat={c}
                    active={selectedTag === c}
                    href={withParams({ tag: selectedTag === c ? null : c })}
                  />
                ))}
                <form action={newBlock}>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
                  >
                    + Create
                  </button>
                </form>
              </div>
            </header>

            {items.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((b) => (
                  <li key={b.id} className="h-full">
                    <BlockCard
                      block={{
                        id: b.id,
                        name: b.name,
                        slug: b.slug,
                        snapshot_url: b.snapshot_url ?? null,
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 text-sm italic text-anamaya-charcoal/50">
                No {t.name.toLowerCase()} blocks yet.
              </p>
            )}
                </section>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
