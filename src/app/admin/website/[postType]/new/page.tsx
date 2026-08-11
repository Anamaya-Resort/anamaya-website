import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import { listPageTemplates } from "@/lib/website-builder/queries";
import PageHeader from "../../_components/PageHeader";
import NewPostWizard, { type WizardTemplate } from "./NewPostWizard";

export default async function PostTypeNewPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType: postTypeSlug } = await params;
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) notFound();

  const templates = await listPageTemplates();

  // Flag the template this post type defaults to (matched by slug) so the
  // wizard can pre-check it. If none matches, the wizard pre-checks the
  // rich-text "None" fallback instead.
  const wizardTemplates: WizardTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    isDefault: t.slug === pt.templateSlug,
  }));

  return (
    <div className="px-5 py-4">
      <PageHeader title={`Add New ${pt.label}`} />

      <NewPostWizard
        postTypeSlug={pt.slug}
        postTypeLabel={pt.label}
        pluralLabel={pt.pluralLabel}
        templates={wizardTemplates}
      />
    </div>
  );
}
