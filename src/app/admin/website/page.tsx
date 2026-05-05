import Link from "next/link";
import { POST_TYPES } from "@/lib/website-builder/post-types";
import { getDashboardCounts } from "@/lib/website-builder/queries";
import PageHeader from "./_components/PageHeader";

export default async function WebsiteBuilderDashboard() {
  const counts = await getDashboardCounts();
  const totals = Object.values(counts).reduce(
    (acc, c) => ({
      matched: acc.matched + c.matched,
      total: acc.total + c.total,
    }),
    { matched: 0, total: 0 },
  );

  return (
    <div className="px-5 py-4">
      <PageHeader title="Dashboard" />

      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-[#1d2327]">
            At a Glance
          </h2>
        </div>
        <p className="px-4 pt-3 text-[12px] text-[#50575e]">
          Each row shows{" "}
          <span className="font-semibold">matched / total</span> — items that
          have been paired with a template vs. all imported items of that
          type. Click to drill in and assign templates.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
          {POST_TYPES.map((pt) => {
            const c = counts[pt.slug] ?? { matched: 0, total: 0 };
            const allMatched = c.total > 0 && c.matched === c.total;
            return (
              <Link
                key={pt.slug}
                href={`/admin/website/${pt.slug}`}
                className="flex items-center gap-2 text-[14px] text-[#2271b1] hover:text-[#135e96] hover:underline"
              >
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    allMatched ? "text-[#2a8a3e]" : "text-[#1d2327]"
                  }`}
                  title={`${c.matched} of ${c.total} matched with a template`}
                >
                  {c.matched}/{c.total}
                </span>
                <span>
                  {c.total === 1 ? pt.label : pt.pluralLabel}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2 text-[12px] text-[#50575e]">
          {totals.matched} of {totals.total} items matched with a template
          across all content types.
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-[#1d2327]">
            Welcome to the Website Builder
          </h2>
        </div>
        <div className="px-4 py-4 text-[13px] leading-relaxed text-[#50575e]">
          <p>
            This is a WordPress-style admin for managing every page on the
            site. Pick a content type from the left to view all items of that
            type, or use{" "}
            <Link
              href="/admin/templates"
              className="text-[#2271b1] hover:underline"
            >
              Templates
            </Link>{" "}
            and{" "}
            <Link
              href="/admin/blocks"
              className="text-[#2271b1] hover:underline"
            >
              Blocks
            </Link>{" "}
            to design the layouts that pages render with.
          </p>
        </div>
      </div>
    </div>
  );
}
