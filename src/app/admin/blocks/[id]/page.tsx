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

  async function saveName(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await renameBlock(id, name);
  }

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
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wider text-anamaya-olive-dark">
          {block.type_slug}
        </div>
        {/* Single form; action buttons override via formAction so we don't nest forms. */}
        <form action={saveName} className="mt-1 flex items-center gap-3">
          <input
            name="name"
            defaultValue={block.name}
            className="w-full max-w-lg rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-lg font-semibold text-anamaya-charcoal focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
          >
            Rename
          </button>
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
        <p className="mt-2 text-xs text-anamaya-charcoal/60">
          Used on:{" "}
          {(usages ?? []).length > 0
            ? (usages ?? []).map((u) => u.page_key).join(", ")
            : "(unused — not placed on any page yet)"}
        </p>
      </header>

      {/* Main editor. LivePreview + VariantCarousel render inside it, above
          the form, so preview + variants stay together as a single unit. */}
      {block.type_slug === "press_bar" && (
        <PressBarEditor
          blockId={id}
          content={block.content}
          onSave={saveContent}
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
