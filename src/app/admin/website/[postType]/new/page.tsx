import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import PageHeader from "../../_components/PageHeader";

export default async function PostTypeNewPage({
  params,
}: {
  params: Promise<{ postType: string }>;
}) {
  const { postType: postTypeSlug } = await params;
  const pt = getPostTypeBySlug(postTypeSlug);
  if (!pt) notFound();

  return (
    <div className="px-5 py-4">
      <PageHeader title={`Add New ${pt.label}`} />
      <div className="rounded-sm border border-[#c3c4c7] bg-white p-6 text-[13px] leading-relaxed text-[#50575e]">
        <p>
          The single-item editor for{" "}
          <span className="font-semibold text-[#1d2327]">{pt.label}</span>{" "}
          will be wired up in Phase 3. New items of this type will default to
          the{" "}
          <span className="font-mono text-[#1d2327]">{pt.templateSlug}</span>{" "}
          template.
        </p>
        <p className="mt-3">
          <Link
            href={`/admin/website/${pt.slug}`}
            className="text-[#2271b1] hover:underline"
          >
            ← Back to all {pt.pluralLabel.toLowerCase()}
          </Link>
        </p>
      </div>
    </div>
  );
}
