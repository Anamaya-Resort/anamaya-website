import { Fragment } from "react";
import Link from "next/link";
import type { PostTypeColumn, PostTypeConfig } from "@/lib/website-builder/post-types";
import type { ListResult } from "@/lib/website-builder/queries";

const COLUMN_LABELS: Record<PostTypeColumn, string> = {
  title: "Title",
  author: "Author",
  categories: "Categories",
  tags: "Tags",
  event_category: "Retreat Category",
  date: "Date",
};

const STATUS_TABS: { key: "all" | "publish" | "draft" | "trash"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "publish", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "trash", label: "Trash" },
];

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function formatDate(iso: string | null, status: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const label =
    status === "draft" ? "Last Modified" : status === "future" ? "Scheduled" : "Published";
  return `${label}\n${date} at ${time}`;
}

function statusBadge(status: string | null): string | null {
  if (!status || status === "publish") return null;
  if (status === "draft") return "— Draft";
  if (status === "private") return "— Private";
  if (status === "pending") return "— Pending";
  if (status === "future") return "— Scheduled";
  if (status === "trash") return "— Trash";
  return `— ${status}`;
}

export default function ListShell({
  pt,
  result,
  currentStatus,
  currentSearch,
}: {
  pt: PostTypeConfig;
  result: ListResult;
  currentStatus: "all" | "publish" | "draft" | "trash";
  currentSearch?: string;
}) {
  const basePath = `/admin/website/${pt.slug}`;
  const colCount = pt.columns.length + 1;
  const { rows, statusCounts, totalCount, page, perPage } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const taxonomyByName = (taxonomy: string) => (row: (typeof rows)[number]) =>
    row.terms.filter((t) => t.taxonomy === taxonomy);

  return (
    <div>
      {/* Status sub-tabs */}
      <ul className="mb-3 flex flex-wrap items-center gap-x-1 text-[13px] text-[#50575e]">
        {STATUS_TABS.map((tab, i) => {
          const count = statusCounts[tab.key];
          const isActive = currentStatus === tab.key;
          return (
            <Fragment key={tab.key}>
              {i > 0 && <li className="text-[#c3c4c7]">|</li>}
              <li>
                <Link
                  href={buildHref(basePath, {
                    status: tab.key === "all" ? undefined : tab.key,
                    s: currentSearch,
                  })}
                  className={
                    isActive
                      ? "font-semibold text-[#1d2327]"
                      : "text-[#2271b1] hover:text-[#135e96] hover:underline"
                  }
                >
                  {tab.label}
                </Link>
                <span className="ml-1 text-[#50575e]">({count})</span>
              </li>
            </Fragment>
          );
        })}
      </ul>

      {/* Top toolbar: bulk actions + filters + search */}
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <select
              disabled
              aria-label="Bulk actions"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px] disabled:opacity-50"
              defaultValue=""
            >
              <option value="">Bulk actions</option>
              <option>Edit</option>
              <option>Move to Trash</option>
            </select>
            <button
              type="button"
              disabled
              aria-label="Apply bulk action"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-3 text-[13px] disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        <form method="get" action={basePath} className="flex items-center gap-1">
          {currentStatus !== "all" && (
            <input type="hidden" name="status" value={currentStatus} />
          )}
          <input
            type="search"
            name="s"
            defaultValue={currentSearch ?? ""}
            aria-label={`Search ${pt.pluralLabel}`}
            placeholder={`Search ${pt.pluralLabel}`}
            className="h-7 w-56 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="h-7 rounded-sm border border-[#2271b1] bg-white px-3 text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  disabled
                  aria-label="Select all"
                  className="h-4 w-4 align-middle"
                />
              </th>
              {pt.columns.map((col) => (
                <th
                  key={col}
                  className={`px-3 py-2 font-semibold text-[#2271b1] ${
                    col === "title" ? "w-[40%]" : ""
                  } ${col === "date" ? "w-40 text-right" : ""}`}
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-12 text-center text-[13px] text-[#50575e]"
                >
                  {currentSearch
                    ? `No ${pt.pluralLabel.toLowerCase()} match “${currentSearch}”.`
                    : `No ${pt.pluralLabel.toLowerCase()} found.`}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      disabled
                      aria-label={`Select ${row.title}`}
                      className="h-4 w-4 align-middle"
                    />
                  </td>
                  {pt.columns.map((col) => {
                    if (col === "title") {
                      const badge = statusBadge(row.wp_status);
                      return (
                        <td key={col} className="px-3 py-2">
                          <Link
                            href={`${basePath}/${row.id}`}
                            className="font-semibold text-[#2271b1] hover:text-[#135e96] hover:underline"
                          >
                            {row.title}
                          </Link>
                          {badge && (
                            <span className="ml-1 text-[#1d2327]">{badge}</span>
                          )}
                          {!row.has_template && (
                            <span className="ml-2 text-[12px] text-[#996800]">
                              (no template)
                            </span>
                          )}
                          <div className="mt-1 flex gap-2 text-[12px] text-[#50575e]">
                            <Link
                              href={`${basePath}/${row.id}`}
                              className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                            >
                              Edit
                            </Link>
                            {row.url_path && (
                              <>
                                <span>|</span>
                                <a
                                  href={row.url_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#2271b1] hover:text-[#135e96] hover:underline"
                                >
                                  View
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    }
                    if (col === "author") {
                      return (
                        <td key={col} className="px-3 py-2 text-[#2271b1]">
                          {row.author?.display_name ?? (
                            <span className="text-[#50575e]">—</span>
                          )}
                        </td>
                      );
                    }
                    if (col === "categories") {
                      const terms = taxonomyByName("category")(row);
                      return (
                        <td key={col} className="px-3 py-2 text-[#2271b1]">
                          {terms.length === 0 ? (
                            <span className="text-[#50575e]">—</span>
                          ) : (
                            terms.map((t, idx) => (
                              <span key={t.slug + idx}>
                                {idx > 0 && (
                                  <span className="text-[#50575e]">, </span>
                                )}
                                {t.name}
                              </span>
                            ))
                          )}
                        </td>
                      );
                    }
                    if (col === "tags") {
                      const terms = taxonomyByName("post_tag")(row);
                      return (
                        <td key={col} className="px-3 py-2 text-[#2271b1]">
                          {terms.length === 0 ? (
                            <span className="text-[#50575e]">—</span>
                          ) : (
                            terms.map((t, idx) => (
                              <span key={t.slug + idx}>
                                {idx > 0 && (
                                  <span className="text-[#50575e]">, </span>
                                )}
                                {t.name}
                              </span>
                            ))
                          )}
                        </td>
                      );
                    }
                    if (col === "event_category") {
                      const terms = taxonomyByName("event_category")(row);
                      return (
                        <td key={col} className="px-3 py-2 text-[#2271b1]">
                          {terms.length === 0 ? (
                            <span className="text-[#50575e]">—</span>
                          ) : (
                            terms.map((t, idx) => (
                              <span key={t.slug + idx}>
                                {idx > 0 && (
                                  <span className="text-[#50575e]">, </span>
                                )}
                                {t.name}
                              </span>
                            ))
                          )}
                        </td>
                      );
                    }
                    if (col === "date") {
                      return (
                        <td
                          key={col}
                          className="px-3 py-2 text-right whitespace-pre-line text-[#50575e]"
                        >
                          {formatDate(
                            row.wp_status === "draft"
                              ? row.date_modified
                              : row.date_published,
                            row.wp_status,
                          )}
                        </td>
                      );
                    }
                    return <td key={col} className="px-3 py-2" />;
                  })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  disabled
                  aria-label="Select all"
                  className="h-4 w-4 align-middle"
                />
              </th>
              {pt.columns.map((col) => (
                <th
                  key={col}
                  className={`px-3 py-2 font-semibold text-[#2271b1] ${
                    col === "date" ? "text-right" : ""
                  }`}
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom toolbar: count + pagination */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#50575e]">
        <div className="flex items-center gap-1">
          <select
            disabled
            aria-label="Bulk actions"
            className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
            defaultValue=""
          >
            <option value="">Bulk actions</option>
          </select>
          <button
            type="button"
            disabled
            aria-label="Apply bulk action"
            className="h-7 rounded-sm border border-[#8c8f94] bg-white px-3 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Link
                href={buildHref(basePath, {
                  status: currentStatus === "all" ? undefined : currentStatus,
                  s: currentSearch,
                  page: page > 1 ? String(page - 1) : undefined,
                })}
                aria-disabled={page <= 1}
                className={`rounded-sm border border-[#8c8f94] bg-white px-2 ${
                  page <= 1
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-[#f6f7f7]"
                }`}
              >
                ‹
              </Link>
              <span>
                {page} of {totalPages}
              </span>
              <Link
                href={buildHref(basePath, {
                  status: currentStatus === "all" ? undefined : currentStatus,
                  s: currentSearch,
                  page: String(page + 1),
                })}
                aria-disabled={page >= totalPages}
                className={`rounded-sm border border-[#8c8f94] bg-white px-2 ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-[#f6f7f7]"
                }`}
              >
                ›
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
