import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { renameBlock, updateBlockContent } from "../actions";
import PressBarEditor from "./editors/PressBarEditor";
import RichTextEditor from "./editors/RichTextEditor";
import HeroEditor from "./editors/HeroEditor";
import CtaBannerEditor from "./editors/CtaBannerEditor";

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

  const { data: usages } = await sb
    .from("block_usages")
    .select("page_key, sort_order")
    .eq("block_id", id);

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

  return (
    <div>
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wider text-anamaya-olive-dark">
          {block.type_slug}
        </div>
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
        </form>
        <p className="mt-2 text-xs text-anamaya-charcoal/60">
          Used on:{" "}
          {(usages ?? []).length > 0
            ? (usages ?? []).map((u) => u.page_key).join(", ")
            : "(unused)"}
        </p>
      </header>

      {block.type_slug === "press_bar" && (
        <PressBarEditor content={block.content} onSave={saveContent} />
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
