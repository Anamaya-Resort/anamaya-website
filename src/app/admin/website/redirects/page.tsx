import Link from "next/link";
import { listRedirects } from "@/lib/website-builder/redirects";
import PageHeader from "../_components/PageHeader";
import { createRedirect, deleteRedirect } from "./actions";

const STATUS_OPTIONS = [301, 302, 307, 308];

function buildHref(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/website/redirects?${qs}` : "/admin/website/redirects";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function RedirectsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.s?.trim() || undefined;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await listRedirects({ page, perPage: 50, search });
  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.perPage));

  return (
    <div className="px-5 py-4">
      <PageHeader title="Redirects" />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Add redirect form */}
        <div className="rounded-sm border border-[#c3c4c7] bg-white">
          <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
            <h2 className="text-[14px] font-semibold text-[#1d2327]">
              Add Redirect
            </h2>
          </div>
          <form action={createRedirect} className="space-y-3 px-4 py-4 text-[13px]">
            <div>
              <label
                htmlFor="source_path"
                className="mb-1 block font-semibold text-[#1d2327]"
              >
                Source path
              </label>
              <input
                id="source_path"
                name="source_path"
                type="text"
                required
                placeholder="/old-page"
                className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
              />
              <p className="mt-1 text-[12px] text-[#50575e]">
                Path on this site to redirect from.
              </p>
            </div>
            <div>
              <label
                htmlFor="target"
                className="mb-1 block font-semibold text-[#1d2327]"
              >
                Target
              </label>
              <input
                id="target"
                name="target"
                type="text"
                required
                placeholder="/new-page or https://…"
                className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
              />
            </div>
            <div>
              <label
                htmlFor="status_code"
                className="mb-1 block font-semibold text-[#1d2327]"
              >
                Type
              </label>
              <select
                id="status_code"
                name="status_code"
                defaultValue="301"
                className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 301 ? "(Permanent)" : s === 302 ? "(Found)" : s === 307 ? "(Temp, preserve method)" : "(Permanent, preserve method)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="notes"
                className="mb-1 block font-semibold text-[#1d2327]"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                className="w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1"
              />
            </div>
            <button
              type="submit"
              className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] font-medium text-white hover:bg-[#135e96]"
            >
              Add Redirect
            </button>
          </form>
        </div>

        {/* List */}
        <div>
          <form
            method="get"
            action="/admin/website/redirects"
            className="mb-2 flex items-center justify-end gap-1"
          >
            <input
              type="search"
              name="s"
              defaultValue={search ?? ""}
              aria-label="Search redirects"
              placeholder="Search redirects"
              className="h-7 w-56 rounded-sm border border-[#8c8f94] bg-white px-2 text-[13px]"
            />
            <button
              type="submit"
              className="h-7 rounded-sm border border-[#2271b1] bg-white px-3 text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
            >
              Search
            </button>
          </form>

          <div className="overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
                  <th className="px-3 py-2 font-semibold text-[#2271b1]">
                    Source
                  </th>
                  <th className="px-3 py-2 font-semibold text-[#2271b1]">
                    Target
                  </th>
                  <th className="w-16 px-3 py-2 font-semibold text-[#2271b1]">
                    Type
                  </th>
                  <th className="w-16 px-3 py-2 text-right font-semibold text-[#2271b1]">
                    Hits
                  </th>
                  <th className="w-32 px-3 py-2 font-semibold text-[#2271b1]">
                    Last Hit
                  </th>
                  <th className="w-20 px-3 py-2 font-semibold text-[#2271b1]">
                    {""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-[#50575e]"
                    >
                      {search
                        ? `No redirects match “${search}”.`
                        : "No redirects yet."}
                    </td>
                  </tr>
                ) : (
                  result.rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                    >
                      <td className="px-3 py-2">
                        <code className="break-all text-[#2271b1]">
                          {r.source_path}
                        </code>
                        {r.notes && (
                          <p className="mt-1 text-[11px] text-[#50575e]">
                            {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <code className="break-all text-[#1d2327]">
                          {r.target}
                        </code>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#50575e]">
                        {r.status_code}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#1d2327]">
                        {r.hits}
                      </td>
                      <td className="px-3 py-2 text-[#50575e]">
                        {formatDate(r.last_hit_at)}
                      </td>
                      <td className="px-3 py-2">
                        <form action={deleteRedirect}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-[#b32d2e] hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex items-center justify-between text-[13px] text-[#50575e]">
            <span>
              {result.totalCount}{" "}
              {result.totalCount === 1 ? "redirect" : "redirects"}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Link
                  href={buildHref({
                    s: search,
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
                  href={buildHref({ s: search, page: String(page + 1) })}
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
    </div>
  );
}
