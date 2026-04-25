import Image from "next/image";
import Link from "next/link";
import { listMedia } from "@/lib/website-builder/queries";
import PageHeader from "../_components/PageHeader";

const PER_PAGE = 48;

function buildHref(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/website/media?${qs}` : "/admin/website/media";
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await listMedia({ page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(result.totalCount / PER_PAGE));

  return (
    <div className="px-5 py-4">
      <PageHeader title="Media Library" />

      <div className="rounded-sm border border-[#c3c4c7] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <div className="flex items-center gap-2">
            <select
              disabled
              aria-label="Media type"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
              defaultValue=""
            >
              <option value="">All media items</option>
              <option>Images</option>
              <option>Videos</option>
              <option>Documents</option>
            </select>
            <select
              disabled
              aria-label="Filter by date"
              className="h-7 rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
              defaultValue=""
            >
              <option value="">All dates</option>
            </select>
          </div>
          <input
            type="search"
            disabled
            aria-label="Search media"
            placeholder="Search Media"
            className="h-7 w-56 rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
          />
        </div>

        {result.rows.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-[#50575e]">
            No media items found.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {result.rows.map((m) => {
              const src = m.storage_url || m.source_url;
              const isImage = m.mime_type?.startsWith("image/") ?? false;
              return (
                <li
                  key={m.id}
                  className="group relative aspect-square overflow-hidden rounded-sm border border-[#c3c4c7] bg-[#f0f0f1]"
                >
                  {isImage && src ? (
                    <Image
                      src={src}
                      alt={m.alt_text ?? m.title ?? ""}
                      fill
                      sizes="(max-width: 768px) 25vw, 12vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[11px] text-[#50575e]">
                      <span className="font-semibold">
                        {m.mime_type ?? "file"}
                      </span>
                      <span className="line-clamp-2">{m.title ?? ""}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#50575e]">
          <span>
            {result.totalCount} {result.totalCount === 1 ? "item" : "items"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Link
                href={buildHref({
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
                href={buildHref({ page: String(page + 1) })}
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
