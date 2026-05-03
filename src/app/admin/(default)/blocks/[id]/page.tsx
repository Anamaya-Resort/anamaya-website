import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import {
  renameBlock,
  updateBlockContent,
  updateBlockSlug,
  duplicateBlock,
  deleteBlock,
} from "../actions";
import PressBarEditor from "./editors/PressBarEditor";
import RichTextEditor from "./editors/RichTextEditor";
import HeroEditor from "./editors/HeroEditor";
import CtaBannerEditor from "./editors/CtaBannerEditor";
import RichBgEditor from "./editors/RichBgEditor";
import VideoShowcaseEditor from "./editors/VideoShowcaseEditor";
import ChecklistEditor from "./editors/ChecklistEditor";
import NewsletterEditor from "./editors/NewsletterEditor";
import ImageOverlayEditor from "./editors/ImageOverlayEditor";
import ImageTextEditor from "./editors/ImageTextEditor";
import DividerEditor from "./editors/DividerEditor";
import QuoteEditor from "./editors/QuoteEditor";
import DateRangeEditor from "./editors/DateRangeEditor";
import RawHtmlEditor from "./editors/RawHtmlEditor";
import PricingTableEditor from "./editors/PricingTableEditor";
import FeatureListEditor from "./editors/FeatureListEditor";
import GalleryEditor from "./editors/GalleryEditor";
import PersonCardEditor from "./editors/PersonCardEditor";
import TwoColumnEditor from "./editors/TwoColumnEditor";
import ThreeColumnEditor from "./editors/ThreeColumnEditor";
import DetailsRatesDynamicEditor from "./editors/DetailsRatesDynamicEditor";
import UiTopEditor from "./editors/UiTopEditor";
import UiSideMenuRightEditor from "./editors/UiSideMenuRightEditor";
import UiAgentEditor from "./editors/UiAgentEditor";
import UiFooterMainEditor from "./editors/UiFooterMainEditor";
import UiFooterLegalEditor from "./editors/UiFooterLegalEditor";
import FeaturedRetreatsEditor from "./editors/FeaturedRetreatsEditor";
import { getBrandTokens } from "@/lib/brand-tokens";

export const dynamic = "force-dynamic";

export default async function EditBlock({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  // Defensive read — if migration 0008 hasn't run, `slug` doesn't
  // exist yet; fall back to the old shape with a synthetic slug.
  async function fetchBlock() {
    const withSlug = await sb
      .from("blocks")
      .select("id, type_slug, name, slug, content")
      .eq("id", id)
      .maybeSingle();
    if (!withSlug.error) return withSlug.data;
    const fb = await sb
      .from("blocks")
      .select("id, type_slug, name, content")
      .eq("id", id)
      .maybeSingle();
    if (!fb.data) return null;
    return { ...fb.data, slug: `${fb.data.type_slug}_?` };
  }
  const block = await fetchBlock();
  if (!block) notFound();
  // Localise narrowed values so closures below don't lose them.
  const typeSlug = block.type_slug;
  const currentName = block.name;
  const currentSlug = block.slug;

  async function fetchSiblings() {
    const withSlug = await sb
      .from("blocks")
      .select("id, name, slug, snapshot_url, updated_at")
      .eq("type_slug", typeSlug)
      .order("updated_at", { ascending: false });
    if (!withSlug.error) return withSlug.data ?? [];
    const fb = await sb
      .from("blocks")
      .select("id, name, snapshot_url, updated_at")
      .eq("type_slug", typeSlug)
      .order("updated_at", { ascending: false });
    return (fb.data ?? []).map((s) => ({ ...s, slug: `${typeSlug}_?` }));
  }
  const [{ data: usages }, siblings, { data: type }, brandTokens] = await Promise.all([
    sb.from("block_usages").select("page_key, sort_order").eq("block_id", id),
    fetchSiblings(),
    sb.from("block_types").select("name").eq("slug", typeSlug).maybeSingle(),
    getBrandTokens(),
  ]);

  /** Save name, slug and content together — the press-bar editor's
      Save button covers all three. */
  async function saveAll(name: string, slug: string, content: unknown) {
    "use server";
    const trimmedName = name.trim();
    const cleanSlug = slug.trim().replace(/\s+/g, "_").toLowerCase();
    if (trimmedName && trimmedName !== currentName) {
      await renameBlock(id, trimmedName);
    }
    if (cleanSlug && cleanSlug !== currentSlug) {
      await updateBlockSlug(id, cleanSlug);
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
          <div className="text-lg font-bold uppercase tracking-wider text-zinc-800">
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
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "rich_text" && (
        <RichTextEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "hero" && (
        <HeroEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "cta_banner" && (
        <CtaBannerEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "rich_bg" && (
        <RichBgEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "video_showcase" && (
        <VideoShowcaseEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "checklist" && (
        <ChecklistEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "newsletter" && (
        <NewsletterEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "image_overlay" && (
        <ImageOverlayEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "image_text" && (
        <ImageTextEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "divider" && (
        <DividerEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "quote" && (
        <QuoteEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "date_range" && (
        <DateRangeEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "raw_html" && (
        <RawHtmlEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "pricing_table" && (
        <PricingTableEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "feature_list" && (
        <FeatureListEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "gallery" && (
        <GalleryEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "person_card" && (
        <PersonCardEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "two_column" && (
        <TwoColumnEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "three_column" && (
        <ThreeColumnEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "details_rates_dynamic" && (
        <DetailsRatesDynamicEditor content={block.content} onSave={saveContent} />
      )}
      {block.type_slug === "ui_top" && (
        <UiTopEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "ui_side_menu_right" && (
        <UiSideMenuRightEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "ui_agent" && (
        <UiAgentEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "ui_footer_main" && (
        <UiFooterMainEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "ui_footer_legal" && (
        <UiFooterLegalEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
      {block.type_slug === "featured_retreats" && (
        <FeaturedRetreatsEditor
          blockId={id}
          name={block.name}
          slug={block.slug}
          content={block.content}
          onSave={saveAll}
          brandTokens={brandTokens}
          variants={siblings}
          typeName={type?.name ?? block.type_slug}
        />
      )}
    </div>
  );
}
