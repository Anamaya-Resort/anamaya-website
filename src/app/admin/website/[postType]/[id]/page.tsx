import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import {
  getItemForEdit,
  listPageTemplates,
} from "@/lib/website-builder/queries";
import { getOrganizationContext } from "@/lib/ai/organization";
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

  const [item, templates, orgCtx] = await Promise.all([
    getItemForEdit(pt.postType, id),
    listPageTemplates(),
    getOrganizationContext(),
  ]);
  if (!item) notFound();
  const properties = orgCtx?.properties ?? [];

  const isTrashed = item.wp_status === "trash";
  const migratedBody = item.content_rendered ?? item.scraped_body_html ?? "";
  const editorStatus = isTrashed ? "draft" : item.wp_status ?? "draft";

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
              <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Permalink
              </div>
              <div className="px-3 py-2 text-[13px]">
                <code className="break-all text-[#2271b1]">
                  {item.url_path}
                </code>
                <p className="mt-1 text-[12px] text-[#50575e]">
                  Permalinks mirror the migrated WP URL — read-only in Phase 3.
                </p>
              </div>
            </div>

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                <span>Body (CMS HTML)</span>
                <span className="text-[12px] font-normal text-[#50575e]">
                  {item.cms_body_html
                    ? "Overrides migrated WP content"
                    : "Empty — migrated WP HTML will be used"}
                </span>
              </div>
              <textarea
                name="cms_body_html"
                defaultValue={item.cms_body_html ?? ""}
                rows={20}
                placeholder="Leave blank to keep using the migrated WP HTML below."
                aria-label="Body HTML"
                className="block w-full resize-y rounded-b-sm border-0 bg-white px-3 py-2 font-mono text-[12px] leading-relaxed text-[#1d2327] focus:outline-none"
              />
            </div>

            {migratedBody && (
              <details className="rounded-sm border border-[#c3c4c7] bg-white">
                <summary className="cursor-pointer border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                  Migrated WP HTML (read-only)
                </summary>
                <pre className="max-h-96 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#50575e]">
                  {migratedBody}
                </pre>
              </details>
            )}

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                Excerpt
              </div>
              <textarea
                name="excerpt"
                defaultValue={item.excerpt ?? ""}
                rows={3}
                aria-label="Excerpt"
                className="block w-full resize-y rounded-b-sm border-0 bg-white px-3 py-2 text-[13px] text-[#1d2327] focus:outline-none"
              />
            </div>

            <div className="rounded-sm border border-[#c3c4c7] bg-white">
              <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
                <span>SEO &amp; Social</span>
                <span className="text-[12px] font-normal text-[#50575e]">
                  Per-page overrides; blank = use site defaults
                </span>
              </div>
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
                    placeholder={item.title ?? ""}
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="meta_description"
                    className="mb-1 block font-semibold text-[#1d2327]"
                  >
                    Meta description
                  </label>
                  <textarea
                    id="meta_description"
                    name="meta_description"
                    defaultValue={item.meta_description ?? ""}
                    rows={3}
                    className="block w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1"
                  />
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
                    placeholder="https://…"
                    className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
                  />
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
            </div>
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
                    <span className="text-[#1d2327]">
                      {item.author?.display_name ?? "—"}
                    </span>
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
                      href={item.url_path}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                    >
                      View on site ↗
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
