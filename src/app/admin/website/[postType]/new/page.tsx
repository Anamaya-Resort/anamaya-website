import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import { listPageTemplates } from "@/lib/website-builder/queries";
import PageHeader from "../../_components/PageHeader";
import { createItem } from "./actions";

export default async function PostTypeNewPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType: postTypeSlug } = await params;
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) notFound();

  const templates = await listPageTemplates();

  // Pre-select the template this post type defaults to (matched by slug).
  // If none matches, the rich-text fallback ("None") is selected instead.
  const defaultTemplate = templates.find((t) => t.slug === pt.templateSlug);
  const defaultTemplateId = defaultTemplate?.id ?? "";

  return (
    <div className="px-5 py-4">
      <PageHeader title={`Add New ${pt.label}`} />

      <form action={createItem}>
        <input type="hidden" name="postTypeSlug" value={pt.slug} />

        <div className="mx-auto max-w-[820px] space-y-4">
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder={`Add ${pt.label.toLowerCase()} title`}
            aria-label="Title"
            autoFocus
            required
            className="w-full rounded-sm border border-[#8c8f94] bg-white px-3 py-2 text-[20px] focus:border-[#2271b1] focus:outline-none"
          />

          {/* Choose a template */}
          <div className="rounded-sm border border-[#c3c4c7] bg-white">
            <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
              Choose a template
              <span className="ml-2 text-[12px] font-normal text-[#50575e]">
                How this {pt.label.toLowerCase()} is rendered. You can change it
                later.
              </span>
            </div>
            <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
              {/* None — rich-text fallback */}
              <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-[#dcdcde] bg-white px-3 py-2 text-[13px] hover:border-[#2271b1] has-[:checked]:border-[#2271b1] has-[:checked]:bg-[#f0f6fc]">
                <input
                  type="radio"
                  name="cms_template_id"
                  value=""
                  defaultChecked={defaultTemplateId === ""}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-[#1d2327]">
                    None (rich-text fallback)
                  </span>
                  <span className="block text-[12px] text-[#50575e]">
                    Renders from the body HTML instead of CMS blocks.
                  </span>
                </span>
              </label>

              {templates.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-2 rounded-sm border border-[#dcdcde] bg-white px-3 py-2 text-[13px] hover:border-[#2271b1] has-[:checked]:border-[#2271b1] has-[:checked]:bg-[#f0f6fc]"
                >
                  <input
                    type="radio"
                    name="cms_template_id"
                    value={t.id}
                    defaultChecked={t.id === defaultTemplateId}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block font-semibold text-[#1d2327]">
                      {t.name}
                    </span>
                    <span className="block font-mono text-[12px] text-[#50575e]">
                      {t.slug}
                      {t.slug === pt.templateSlug ? " · default" : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/admin/website/${pt.slug}`}
              className="text-[13px] text-[#2271b1] hover:underline"
            >
              ← Back to all {pt.pluralLabel.toLowerCase()}
            </Link>
            <button
              type="submit"
              className="rounded-sm bg-[#2271b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#135e96]"
            >
              Create {pt.label.toLowerCase()}
            </button>
          </div>

          <p className="text-[12px] text-[#50575e]">
            Creates a draft and opens its editor, where you can fill in the
            content, SEO and publish settings.
          </p>
        </div>
      </form>
    </div>
  );
}
