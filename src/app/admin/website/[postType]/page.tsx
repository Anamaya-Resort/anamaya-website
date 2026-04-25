import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import { listByPostType } from "@/lib/website-builder/queries";
import PageHeader from "../_components/PageHeader";
import ListShell from "../_components/ListShell";

type StatusKey = "all" | "publish" | "draft" | "trash";

function normalizeStatus(s: string | undefined): StatusKey {
  if (s === "publish" || s === "draft" || s === "trash") return s;
  return "all";
}

export default async function PostTypeListPage({
  params,
  searchParams,
}: {
  params: Promise<{ postType: string }>;
  searchParams: Promise<{
    status?: string;
    s?: string;
    page?: string;
  }>;
}) {
  const { postType: postTypeSlug } = await params;
  const sp = await searchParams;
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) notFound();

  const status = normalizeStatus(sp.status);
  const search = sp.s?.trim() || undefined;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const result = await listByPostType(pt.postType, {
    status,
    search,
    page,
    perPage: 20,
  });

  return (
    <div className="px-5 py-4">
      <PageHeader
        title={pt.pluralLabel}
        addNew={{
          href: `/admin/website/${pt.slug}/new`,
          label: `Add New ${pt.label}`,
        }}
      />
      <ListShell
        pt={pt}
        result={result}
        currentStatus={status}
        currentSearch={search}
      />
    </div>
  );
}
