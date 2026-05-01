import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createBlock } from "./actions";
import BlockCard from "./BlockCard";

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
  ui_top: ["ui"],
  ui_side_menu_right: ["ui"],
  ui_agent: ["ui"],
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

function CategoryTag({ cat, active }: { cat: Category; active: boolean }) {
  const href = active ? "/admin/blocks" : `/admin/blocks?tag=${encodeURIComponent(cat)}`;
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

export default async function BlocksIndex({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const selectedTag = (ALL_CATEGORIES as string[]).includes(tag ?? "")
    ? (tag as Category)
    : null;
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
      .select("slug, name, description, is_overlay, is_active, sort_order")
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
    if (!selectedTag) return true;
    return (BLOCK_CATEGORIES[t.slug] ?? []).includes(selectedTag);
  });

  return (
    <div className="mx-[calc(50%-50vw)] w-screen space-y-8 px-8">
      <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-3xl font-semibold text-anamaya-charcoal">Blocks</h1>
        <p className="mt-2 max-w-3xl text-base text-anamaya-charcoal/70">
          Reusable content blocks are the building pieces of every page. Edit a block once and
          your changes flow through to every page that uses it. Create multiple blocks of the
          same type when you need different variants for different pages. Filter by category
          below to find the layout you need.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {ALL_CATEGORIES.map((c) => (
            <CategoryTag key={c} cat={c} active={selectedTag === c} />
          ))}
          {selectedTag && (
            <Link
              href="/admin/blocks"
              className="ml-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60 underline hover:text-anamaya-charcoal"
            >
              Clear
            </Link>
          )}
        </div>
      </section>

      {selectedTag && visibleTypes.length === 0 && (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm italic text-anamaya-charcoal/60">
          No block types match the <span className="font-semibold not-italic">{selectedTag}</span>{" "}
          filter.{" "}
          <Link href="/admin/blocks" className="underline hover:text-anamaya-charcoal">
            Show all
          </Link>
          .
        </div>
      )}

      {visibleTypes.map((t) => {
        async function newBlock() {
          "use server";
          const id = await createBlock(t.slug, `New ${t.name}`);
          redirect(`/admin/blocks/${id}`);
        }

        const cats = BLOCK_CATEGORIES[t.slug] ?? [];
        const items = byType.get(t.slug) ?? [];

        return (
          <section key={t.slug} className="space-y-4">
            <header className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-anamaya-charcoal">{t.name}</h2>
                {t.description && (
                  <p className="mt-1 text-sm text-anamaya-charcoal/60">{t.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {cats.map((c) => (
                  <CategoryTag key={c} cat={c} active={selectedTag === c} />
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
}
