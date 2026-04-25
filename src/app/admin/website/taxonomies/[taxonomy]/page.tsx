import { notFound } from "next/navigation";
import { listTaxonomyTerms } from "@/lib/website-builder/queries";
import PageHeader from "../../_components/PageHeader";

const TAXONOMY_LABELS: Record<string, { singular: string; plural: string }> = {
  category: { singular: "Category", plural: "Categories" },
  post_tag: { singular: "Tag", plural: "Tags" },
  event_category: {
    singular: "Retreat Category",
    plural: "Retreat Categories",
  },
};

export default async function TaxonomyListPage({
  params,
}: {
  params: Promise<{ taxonomy: string }>;
}) {
  const { taxonomy } = await params;
  const labels = TAXONOMY_LABELS[taxonomy];
  if (!labels) notFound();

  const terms = await listTaxonomyTerms(taxonomy);

  return (
    <div className="px-5 py-4">
      <PageHeader title={labels.plural} />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left: Add new term form (disabled until Phase 3 wires the action) */}
        <div className="rounded-sm border border-[#c3c4c7] bg-white">
          <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
            <h2 className="text-[14px] font-semibold text-[#1d2327]">
              Add New {labels.singular}
            </h2>
          </div>
          <div className="space-y-4 px-4 py-4 text-[13px]">
            <div>
              <label className="mb-1 block font-semibold text-[#1d2327]">
                Name
              </label>
              <input
                type="text"
                disabled
                aria-label="Name"
                className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
              />
              <p className="mt-1 text-[12px] text-[#50575e]">
                The name is how it appears on your site.
              </p>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-[#1d2327]">
                Slug
              </label>
              <input
                type="text"
                disabled
                aria-label="Slug"
                className="h-7 w-full rounded-sm border border-[#8c8f94] bg-white px-2 disabled:opacity-50"
              />
              <p className="mt-1 text-[12px] text-[#50575e]">
                URL-friendly version. Lowercase, hyphens only.
              </p>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-[#1d2327]">
                Description
              </label>
              <textarea
                disabled
                aria-label="Description"
                rows={4}
                className="w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1 disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              disabled
              className="rounded-sm bg-[#2271b1] px-3 py-1 text-[13px] text-white disabled:opacity-50"
            >
              Add New {labels.singular}
            </button>
          </div>
        </div>

        {/* Right: Term list */}
        <div className="overflow-hidden rounded-sm border border-[#c3c4c7] bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Select all"
                    className="h-4 w-4"
                  />
                </th>
                <th className="px-3 py-2 font-semibold text-[#2271b1]">
                  Name
                </th>
                <th className="px-3 py-2 font-semibold text-[#2271b1]">
                  Description
                </th>
                <th className="px-3 py-2 font-semibold text-[#2271b1]">
                  Slug
                </th>
                <th className="w-20 px-3 py-2 text-right font-semibold text-[#2271b1]">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {terms.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-[#50575e]"
                  >
                    No {labels.plural.toLowerCase()} found.
                  </td>
                </tr>
              ) : (
                terms.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled
                        aria-label={`Select ${t.name}`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-[#2271b1]">
                      {t.name}
                    </td>
                    <td className="px-3 py-2 text-[#50575e]">
                      {t.description ? (
                        <span className="line-clamp-2">{t.description}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#50575e]">
                      {t.slug ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#2271b1]">
                      {t.post_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 text-[13px] text-[#50575e]">
        {terms.length} {terms.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
