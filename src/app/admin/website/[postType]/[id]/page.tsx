import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import {
  getItemForEdit,
  listPageTemplates,
} from "@/lib/website-builder/queries";
import { getOrganizationContext } from "@/lib/ai/organization";
import {
  getGlobalTracking,
  getPageTracking,
  getTemplateTracking,
  globalTagSummary,
  templateLabel,
} from "@/lib/website-builder/tracking";
import AiTextarea from "@/components/ai/AiTextarea";
import BodyEditor from "@/components/admin/website/BodyEditor";
import EditablePermalink from "@/components/admin/website/EditablePermalink";
import HtmlViewer from "@/components/admin/website/HtmlViewer";
import PageHeader from "../../_components/PageHeader";
import { updateItem, trashItem, restoreItem } from "./actions";

const STATUS_OPTIONS = [
  { value: "publish", label: "Published" },
  { value: "private", label: "Private" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
  { value: "future", label: "Scheduled" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ postType: string; id: string }>;
}) {
  const { postType: postTypeSlug, id } = await params;
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) notFound();

  const [item, templates, orgCtx, pageTracking, templateTracking, globalTracking] =
    await Promise.all([
      getItemForEdit(pt.postType, id),
      listPageTemplates(),
      getOrganizationContext(),
      getPageTracking(id),
      getTemplateTracking(pt.templateSlug),
      getGlobalTracking(),
    ]);
  if (!item) notFound();
  const properties = orgCtx?.properties ?? [];

  const isTrashed = item.wp_status === "trash";
  const migratedBody = item.content_rendered ?? item.scraped_body_html ?? "";
  const editorStatus = isTrashed ? "draft" : item.wp_status ?? "draft";

  // Migrated SEO is intentionally kept inline next to the SEO inputs
  // (where it's most useful while authoring); this consolidated panel
  // covers the rest of the WP-source audit data, which becomes inert
  // once the page is rebuilt in the new CMS.
  const hasMigrationProvenance =
    item.wp_id != null ||
    !!item.wp_template ||
    item.menu_order != null ||
    item.parent_wp_id != null ||
    !!item.scraped_at;
  const hasMigratedData =
    !!migratedBody ||
    !!item.content_raw ||
    item.elementor_data != null ||
    item.acf != null ||
    item.post_meta != null ||
    !!item.featured_media?.url ||
    !!item.excerpt_rendered ||
    hasMigrationProvenance;

  return (
    <div className="px-5 py-4">
      <PageHeader
        title={`Edit ${pt.label}`}
        addNew={{
          href: `/admin/website/${pt.slug}/new`,
          label: `Add New ${pt.label}`,
        }}
      />

      {isTrashed && (
        <div className="mb-3 rounded-sm border border-[#dba617] bg-[#fcf9e8] px-3 py-2 text-[13px] text-[#1d2327]">
          This item is in the Trash. Restore it before editing.
        </div>
      )}

      <form action={updateItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="postTypeSlug" value={pt.slug} />

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Main column */}
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              defaultValue={item.title ?? ""}
              placeholder={`Add ${pt.label.toLowerCase()} title`}
              aria-label="Title"
              className="w-full rounded-sm border border-[#8c8f94] bg-white px-3 py-2 text-[20px] focus:border-[#2271b1] focus:outline-none"
            />

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                <span>Body</span>
                <span className="text-[12px] font-normal text-[#50575e]">
                  {item.cms_body_html
                    ? "Overrides migrated WP content"
                    : "Empty — migrated WP HTML will be used"}
                </span>
              </div>
              <div className="px-2 pb-2 pt-2">
                <BodyEditor
                  name="cms_body_html"
                  defaultValue={item.cms_body_html ?? ""}
                  placeholder="Leave blank to keep using the migrated WP HTML below."
                  minHeight={360}
                />
              </div>
            </div>

            <details open className="rounded-sm border border-[#c3c4c7] bg-white">
              <summary className="cursor-pointer border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Excerpt
              </summary>
              <AiTextarea
                name="excerpt"
                defaultValue={item.excerpt ?? ""}
                rows={3}
                aria-label="Excerpt"
                placeholder={item.excerpt_rendered ?? ""}
                pageContext={{
                  postType: pt.postType,
                  postId: item.id,
                  title: item.title ?? "",
                  urlPath: item.url_path ?? "",
                  propertyId: item.property_id ?? null,
                  field: "excerpt",
                }}
                className="block w-full resize-y rounded-b-sm border-0 bg-white px-3 py-2 text-[13px] text-[#1d2327] focus:outline-none"
              />
            </details>

            <details className="rounded-sm border border-[#c3c4c7] bg-white">
              <summary className="cursor-pointer border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Tracking Code
                <span className="ml-2 text-[12px] font-normal text-[#50575e]">
                  This page only — stacks on top of template &amp; global
                </span>
              </summary>
              <div className="space-y-3 px-3 py-3 text-[13px]">
                <div>
                  <label htmlFor="tracking_head_html" className="mb-1 block font-semibold text-[#1d2327]">
                    Head code (this page)
                  </label>
                  <textarea
                    id="tracking_head_html"
                    name="tracking_head_html"
                    defaultValue={pageTracking.head_html}
                    rows={4}
                    className="block w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label htmlFor="tracking_body_html" className="mb-1 block font-semibold text-[#1d2327]">
                    Footer code (this page)
                  </label>
                  <textarea
                    id="tracking_body_html"
                    name="tracking_body_html"
                    defaultValue={pageTracking.body_html}
                    rows={4}
                    className="block w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1 font-mono text-[13px]"
                  />
                </div>

                <div className="rounded-sm border border-[#dcdcde] bg-[#f6f7f7] px-3 py-2">
                  <p className="mb-2 text-[12px] font-semibold text-[#50575e]">
                    Also active on this page (read-only):
                  </p>
                  <p className="text-[12px] text-[#50575e]">
                    <strong>{templateLabel(pt.templateSlug)}</strong> template ·{" "}
                    <Link
                      href={`/admin/website/technical?doc=tracking&tab=templates&template=${encodeURIComponent(pt.templateSlug)}`}
                      className="text-[#2271b1] hover:underline"
                    >
                      edit template →
                    </Link>
                  </p>
                  {(templateTracking.head_html || templateTracking.body_html) && (
                    <textarea
                      readOnly
                      value={[templateTracking.head_html, templateTracking.body_html].filter(Boolean).join("\n")}
                      rows={3}
                      className="mt-1 block w-full rounded-sm border border-[#dcdcde] bg-[#f0f0f1] px-2 py-1 font-mono text-[12px] text-[#50575e]"
                    />
                  )}
                  <p className="mt-2 text-[12px] text-[#50575e]">
                    <strong>Global</strong> · {globalTagSummary(globalTracking)} ·{" "}
                    <Link href="/admin/website/technical?doc=tracking&tab=global" className="text-[#2271b1] hover:underline">
                      edit global →
                    </Link>
                  </p>
                  {(globalTracking.custom_head_html || globalTracking.custom_body_html) && (
                    <textarea
                      readOnly
                      value={[globalTracking.custom_head_html, globalTracking.custom_body_html].filter(Boolean).join("\n")}
                      rows={3}
                      className="mt-1 block w-full rounded-sm border border-[#dcdcde] bg-[#f0f0f1] px-2 py-1 font-mono text-[12px] text-[#50575e]"
                    />
                  )}
                </div>
              </div>
            </details>

            <details open className="rounded-sm border border-[#c3c4c7] bg-white">
              <summary className="cursor-pointer border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                SEO &amp; Social
                <span className="ml-2 text-[12px] font-normal text-[#50575e]">
                  Per-page overrides; blank = use site defaults
                </span>
              </summary>
              <div className="space-y-3 px-3 py-3 text-[13px]">
                <div>
                  <label
                    htmlFor="meta_title"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    Meta title
                  </label>
                  <input
                    id="meta_title"
                    name="meta_title"
                    type="text"
                    defaultValue={item.meta_title ?? ""}
                    placeholder={
                      item.migrated_seo?.meta_title ?? item.title ?? ""
                    }
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  />
                  {item.migrated_seo?.meta_title && (
                    <p className="mt-1 text-[12px] text-[#50575e]">
                      Migrated from WP:{" "}
                      <span className="text-[#1d2327]">
                        {item.migrated_seo.meta_title}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="meta_description"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    Meta description
                  </label>
                  <AiTextarea
                    id="meta_description"
                    name="meta_description"
                    defaultValue={item.meta_description ?? ""}
                    rows={3}
                    placeholder={item.migrated_seo?.meta_description ?? ""}
                    pageContext={{
                      postType: pt.postType,
                      postId: item.id,
                      title: item.title ?? "",
                      urlPath: item.url_path ?? "",
                      propertyId: item.property_id ?? null,
                      field: "meta_description",
                    }}
                    className="block w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1"
                  />
                  {item.migrated_seo?.meta_description && (
                    <p className="mt-1 text-[12px] text-[#50575e]">
                      Migrated from WP:{" "}
                      <span className="text-[#1d2327]">
                        {item.migrated_seo.meta_description}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="og_image_url"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    OG image URL
                  </label>
                  <input
                    id="og_image_url"
                    name="og_image_url"
                    type="text"
                    defaultValue={item.og_image_url ?? ""}
                    placeholder={item.migrated_seo?.og_image ?? "https://…"}
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  />
                  {item.migrated_seo?.og_image && (
                    <p className="mt-1 break-all text-[12px] text-[#50575e]">
                      Migrated from WP:{" "}
                      <span className="text-[#1d2327]">
                        {item.migrated_seo.og_image}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="canonical_url"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    Canonical URL
                  </label>
                  <input
                    id="canonical_url"
                    name="canonical_url"
                    type="text"
                    defaultValue={item.canonical_url ?? ""}
                    placeholder={item.url_path}
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="noindex"
                    defaultChecked={item.noindex}
                    className="h-4 w-4"
                  />
                  <span className="text-[13px]">
                    No-index this page (hide from search engines)
                  </span>
                </label>
              </div>
            </details>

            {hasMigratedData && (
              <details
                open
                className="rounded-sm border border-[#c3c4c7] bg-white"
              >
                <summary className="cursor-pointer border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                  Migrated from WordPress
                  <span className="ml-2 text-[12px] font-normal text-[#50575e]">
                    Read-only audit data — collapse once this page is rebuilt
                  </span>
                </summary>
                <div className="space-y-4 px-3 py-3">
                  {item.featured_media?.url && (
                    <section>
                      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        Featured image
                      </h4>
                      <Image
                        src={item.featured_media.url}
                        alt={item.featured_media.alt ?? ""}
                        width={item.featured_media.width ?? 1200}
                        height={item.featured_media.height ?? 800}
                        className="h-auto max-w-full rounded-sm border border-[#dcdcde]"
                        unoptimized
                      />
                      <p className="mt-2 break-all text-[12px] text-[#50575e]">
                        {item.featured_media.url}
                        {item.featured_media.width &&
                          item.featured_media.height && (
                            <>
                              {" "}
                              ({item.featured_media.width}×
                              {item.featured_media.height})
                            </>
                          )}
                      </p>
                    </section>
                  )}

                  {item.excerpt_rendered && (
                    <section>
                      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        Rendered excerpt
                      </h4>
                      <p className="text-[13px] text-[#1d2327]">
                        {item.excerpt_rendered}
                      </p>
                    </section>
                  )}

                  {migratedBody && (
                    <section>
                      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        Body —{" "}
                        {item.scraped_body_html
                          ? "controlled crawl"
                          : "WP REST content.rendered"}
                      </h4>
                      <div className="overflow-hidden rounded-sm border border-[#dcdcde]">
                        <HtmlViewer html={migratedBody} />
                      </div>
                    </section>
                  )}

                  {item.content_raw &&
                    item.content_raw !== item.content_rendered && (
                      <details className="overflow-hidden rounded-sm border border-[#dcdcde]">
                        <summary className="cursor-pointer bg-[#f6f7f7] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                          Raw content (with shortcodes)
                        </summary>
                        <HtmlViewer html={item.content_raw} />
                      </details>
                    )}

                  {item.elementor_data != null && (
                    <details className="overflow-hidden rounded-sm border border-[#dcdcde]">
                      <summary className="cursor-pointer bg-[#f6f7f7] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        Elementor data (JSON)
                      </summary>
                      <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#50575e]">
                        {JSON.stringify(item.elementor_data, null, 2)}
                      </pre>
                    </details>
                  )}

                  {item.acf != null && (
                    <details className="overflow-hidden rounded-sm border border-[#dcdcde]">
                      <summary className="cursor-pointer bg-[#f6f7f7] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        ACF fields (JSON)
                      </summary>
                      <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#50575e]">
                        {JSON.stringify(item.acf, null, 2)}
                      </pre>
                    </details>
                  )}

                  {item.post_meta != null && (
                    <details className="overflow-hidden rounded-sm border border-[#dcdcde]">
                      <summary className="cursor-pointer bg-[#f6f7f7] px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        WP post meta (JSON)
                      </summary>
                      <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#50575e]">
                        {JSON.stringify(item.post_meta, null, 2)}
                      </pre>
                    </details>
                  )}

                  {hasMigrationProvenance && (
                    <section>
                      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                        Provenance
                      </h4>
                      <div className="space-y-1 text-[12px] text-[#50575e]">
                        {item.wp_id != null && (
                          <div>
                            WP post ID:{" "}
                            <code className="text-[#1d2327]">
                              {item.wp_id}
                            </code>
                          </div>
                        )}
                        {item.wp_template && (
                          <div>
                            WP template:{" "}
                            <code className="text-[#1d2327]">
                              {item.wp_template}
                            </code>
                          </div>
                        )}
                        {item.menu_order != null && (
                          <div>
                            Menu order:{" "}
                            <span className="text-[#1d2327]">
                              {item.menu_order}
                            </span>
                          </div>
                        )}
                        {item.parent_wp_id != null && (
                          <div>
                            Parent WP ID:{" "}
                            <code className="text-[#1d2327]">
                              {item.parent_wp_id}
                            </code>
                          </div>
                        )}
                        {item.scraped_at && (
                          <div>
                            Last scraped:{" "}
                            <span className="text-[#1d2327]">
                              {formatDateTime(item.scraped_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Publish
              </div>
              <div className="space-y-3 px-3 py-3 text-[13px]">
                <div>
                  <label
                    htmlFor="status"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={editorStatus}
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[12px] text-[#50575e]">
                  <div>
                    Published:{" "}
                    <span className="text-[#1d2327]">
                      {formatDateTime(item.date_published)}
                    </span>
                  </div>
                  <div>
                    Last modified:{" "}
                    <span className="text-[#1d2327]">
                      {formatDateTime(item.date_modified)}
                    </span>
                  </div>
                  <div>
                    Author:{" "}
                    {item.author ? (
                      <Link
                        href="/admin/website/authors"
                        className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                      >
                        {item.author.display_name ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-[#1d2327]">—</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#dcdcde] pt-3">
                  {isTrashed ? (
                    <>
                      <span className="text-[12px] text-[#996800]">
                        In Trash
                      </span>
                      <button
                        type="submit"
                        formAction={restoreItem}
                        className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]"
                      >
                        Restore
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="submit"
                        formAction={trashItem}
                        className="text-[13px] text-[#b32d2e] hover:underline"
                      >
                        Move to Trash
                      </button>
                      <button
                        type="submit"
                        className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]"
                      >
                        Update
                      </button>
                    </>
                  )}
                </div>
                <EditablePermalink defaultValue={item.url_path} />
              </div>
            </div>

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Template
              </div>
              <div className="px-3 py-3 text-[13px]">
                <select
                  name="cms_template_id"
                  defaultValue={item.cms_template_id ?? ""}
                  aria-label="Template"
                  className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                >
                  <option value="">— Rich-text fallback —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[12px] text-[#50575e]">
                  Default: <code>{pt.templateSlug}</code>. Choose a CMS
                  template to render this page with blocks instead of HTML.
                </p>
              </div>
            </div>

            {(() => {
              const categories = item.terms.filter(
                (t) => t.taxonomy === "category",
              );
              if (categories.length === 0) return null;
              return (
                <div className="rounded-sm border border-[#c3c4c7] bg-white">
                  <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                    Categories
                  </div>
                  <ul className="space-y-1 px-3 py-3 text-[13px]">
                    {categories.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href="/admin/website/taxonomies/category"
                          className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                        >
                          {t.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {(() => {
              const tags = item.terms.filter((t) => t.taxonomy === "post_tag");
              if (tags.length === 0) return null;
              return (
                <div className="rounded-sm border border-[#c3c4c7] bg-white">
                  <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-1 px-3 py-3 text-[13px]">
                    {tags.map((t) => (
                      <Link
                        key={t.slug}
                        href="/admin/website/taxonomies/post_tag"
                        className="rounded-sm border border-[#dcdcde] bg-[#f6f7f7] px-2 py-0.5 text-[#2271b1] hover:bg-[#fff] hover:text-[#135e96]"
                      >
                        {t.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const otherTerms = item.terms.filter(
                (t) => t.taxonomy !== "category" && t.taxonomy !== "post_tag",
              );
              if (otherTerms.length === 0) return null;
              const grouped = new Map<string, typeof otherTerms>();
              for (const t of otherTerms) {
                const arr = grouped.get(t.taxonomy) ?? [];
                arr.push(t);
                grouped.set(t.taxonomy, arr);
              }
              return Array.from(grouped.entries()).map(([taxonomy, list]) => (
                <div
                  key={taxonomy}
                  className="rounded-sm border border-[#c3c4c7] bg-white"
                >
                  <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327] capitalize">
                    {taxonomy.replace(/_/g, " ")}
                  </div>
                  <ul className="space-y-1 px-3 py-3 text-[13px]">
                    {list.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/admin/website/taxonomies/${encodeURIComponent(taxonomy)}`}
                          className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                        >
                          {t.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}

            {properties.length > 0 ? (
              <div className="rounded-sm border border-[#c3c4c7] bg-white">
                <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                  Property
                </div>
                <div className="px-3 py-3 text-[13px]">
                  <select
                    name="property_id"
                    defaultValue={item.property_id ?? ""}
                    aria-label="Property"
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  >
                    <option value="">— Org-wide (no property) —</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[12px] text-[#50575e]">
                    Scopes this page to a sub-property — used by AI tools and
                    the visitor agent to give property-specific answers.
                  </p>
                </div>
              </div>
            ) : (
              // Property list is empty (org has no properties OR AO is
              // unreachable). Preserve any existing property_id so a network
              // blip doesn't silently clear the tag on Update.
              <input
                type="hidden"
                name="property_id"
                value={item.property_id ?? ""}
              />
            )}

            {item.ai_last_edit_at && (
              <div className="rounded-sm border border-[#c3c4c7] bg-white">
                <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                  AI Activity
                </div>
                <div className="space-y-1 px-3 py-3 text-[12px] text-[#50575e]">
                  <div>
                    Last edit:{" "}
                    <span className="text-[#1d2327]">
                      {formatDateTime(item.ai_last_edit_at)}
                    </span>
                  </div>
                  {item.ai_last_kind && (
                    <div>
                      Kind:{" "}
                      <span className="text-[#1d2327]">
                        {item.ai_last_kind}
                      </span>
                    </div>
                  )}
                  {item.ai_last_model && (
                    <div>
                      Model:{" "}
                      <code className="text-[#1d2327]">
                        {item.ai_last_model}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Quick Links
              </div>
              <ul className="space-y-1 px-3 py-3 text-[13px]">
                <li>
                  <Link
                    href={`/admin/website/${pt.slug}`}
                    className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                  >
                    ← All {pt.pluralLabel}
                  </Link>
                </li>
                {item.url_path && (
                  <li>
                    <a
                      href={`/snapshot${item.url_path.startsWith("/") ? item.url_path : `/${item.url_path}`}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                    >
                      View WP snapshot ↗
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
