import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import {
  renameBlock,
  updateBlockContent,
  duplicateBlock,
  deleteBlock,
} from "../actions";
import PressBarEditor from "./editors/PressBarEditor";
import RichTextEditor from "./editors/RichTextEditor";
import HeroEditor from "./editors/HeroEditor";
import CtaBannerEditor from "./editors/CtaBannerEditor";
import { getBrandTokens } from "@/lib/brand-tokens";

export const dynamic = "force-dynamic";

export default async function EditBlock({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: block } = await sb
    .from("blocks")
    .select("id, type_slug, name, content")
    .eq("id", id)
    .maybeSingle();
  if (!block) notFound();
  // Local constants so the inline server actions below don't lose
  // TypeScript narrowing on `block` when captured inside closures.
  const currentName = block.name;

  const [{ data: usages }, { data: siblings }, { data: type }, brandTokens] = await Promise.all([
    sb.from("block_usages").select("page_key, sort_order").eq("block_id", id),
    sb
      .from("blocks")
      .select("id, name, snapshot_url, updated_at")
      .eq("type_slug", block.type_slug)
      .order("updated_at", { ascending: false }),
    sb.from("block_types").select("name").eq("slug", block.type_slug).maybeSingle(),
    getBrandTokens(),
  ]);

  /** Save both the name and the content in one action — the press-bar
      editor's Save button covers both. */
  async function saveAll(name: string, content: unknown) {
    "use server";
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      await renameBlock(id, trimmed);
    }
    await updateBlockContent(id, content);
    redirect(`/admin/blocks/${id}?saved=1`);
  }

  /** Content-only save — kept so the older rich_text / hero / cta_banner
      editors that don't yet own the name field keep working. */
  async function saveContent(content: unknown) {
    "use server";
    await updateBlockContent(id, content);
    redirect(`/admin/blocks/${id}?saved=1`);
  }

  // Accepts FormData because it's bound to a submit button's formAction.
  async function duplicate(_: FormData) {
    "use server";
    const newId = await duplicateBlock(id);
    redirect(`/admin/blocks/${newId}`);
  }

  async function remove(_: FormData) {
    "use server";
    await deleteBlock(id);
    redirect("/admin/blocks");
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-anamaya-olive-dark">
            {block.type_slug}
          </div>
          <p className="mt-1 text-xs text-anamaya-charcoal/60">
            Used on:{" "}
            {(usages ?? []).length > 0
              ? (usages ?? []).map((u) => u.page_key).join(", ")
              : "(unused — not placed on any page yet)"}
          </p>
        </div>
        {/* Standalone form for the non-save actions. Buttons override via
            formAction so a single form can route to either server action. */}
        <form className="flex items-center gap-2">
          <button
            type="submit"
            formAction={duplicate}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
            title="Create a copy of this block as a new variant"
          >
            Duplicate
          </button>
          <button
            type="submit"
            formAction={remove}
            className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
            title="Delete this block (also removes all its page placements)"
          >
            Delete
          </button>
        </form>
      </header>

      {/* Main editor. LivePreview + VariantCarousel render inside it, above
          the form, so preview + variants stay together as a single unit. */}
      {block.type_slug === "press_bar" && (
        <PressBarEditor
          blockId={id}
          name={block.name}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings ?? []}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "rich_text" && (
        <RichTextEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "hero" && (
        <HeroEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "cta_banner" && (
        <CtaBannerEditor content={block.content} onSave={saveContent} />
      )}
    </div>
  );
}
