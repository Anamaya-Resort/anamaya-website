import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createBlock } from "./actions";

export const dynamic = "force-dynamic";

export default async function BlocksIndex() {
  const sb = supabaseServer();
  const [{ data: types }, { data: blocks }, { data: usages }] = await Promise.all([
    sb.from("block_types").select("slug, name, description").order("name"),
    sb.from("blocks").select("id, type_slug, name, updated_at").order("name"),
    sb.from("block_usages").select("block_id, page_key"),
  ]);

  const usageByBlock = new Map<string, string[]>();
  for (const u of usages ?? []) {
    const arr = usageByBlock.get(u.block_id) ?? [];
    arr.push(u.page_key);
    usageByBlock.set(u.block_id, arr);
  }

  const byType = new Map<string, any[]>();
  for (const b of blocks ?? []) {
    const arr = byType.get(b.type_slug) ?? [];
    arr.push(b);
    byType.set(b.type_slug, arr);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-anamaya-charcoal">Blocks</h1>
        <p className="mt-1 text-sm text-anamaya-charcoal/70">
          Reusable content blocks. Edit once — changes flow through to every page that uses them.
          Create multiple blocks of the same type for different variants on different pages.
        </p>
      </header>

      {(types ?? []).map((t) => {
        async function newBlock(formData: FormData) {
          "use server";
          const name = String(formData.get("name") ?? "").trim() || `New ${t.name}`;
          const id = await createBlock(t.slug, name);
          redirect(`/admin/blocks/${id}`);
        }

        return (
          <section key={t.slug}>
            <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
                  {t.name}
                </h2>
                {t.description && (
                  <p className="text-xs text-anamaya-charcoal/60">{t.description}</p>
                )}
              </div>
              <form action={newBlock} className="flex items-center gap-2">
                <input
                  name="name"
                  placeholder={`New ${t.name} name`}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
                >
                  + Create
                </button>
              </form>
            </header>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(byType.get(t.slug) ?? []).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/blocks/${b.id}`}
                    className="block rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-sm"
                  >
                    <div className="font-semibold text-anamaya-charcoal">{b.name}</div>
                    <div className="mt-1 text-xs text-anamaya-charcoal/60">
                      Used on:{" "}
                      {(usageByBlock.get(b.id) ?? []).length > 0
                        ? (usageByBlock.get(b.id) ?? []).join(", ")
                        : "(unused — not placed on any page yet)"}
                    </div>
                  </Link>
                </li>
              ))}
              {(byType.get(t.slug) ?? []).length === 0 && (
                <li className="text-sm italic text-anamaya-charcoal/50">
                  No {t.name.toLowerCase()} blocks yet.
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
