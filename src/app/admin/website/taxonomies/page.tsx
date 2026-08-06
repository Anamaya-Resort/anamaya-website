import PageHeader from "../_components/PageHeader";
import { getTaxonomyManagerData } from "./data";
import TaxonomyManager from "./TaxonomyManager";

export default async function TaxonomiesPage() {
  const data = await getTaxonomyManagerData();

  return (
    <div className="px-5 py-4">
      <PageHeader title="Categories & Tags" />
      <p className="mb-3 text-[13px] text-[#50575e]">
        Counts are live — the number of published articles currently using each
        term.
      </p>

      {data === null ? (
        <div className="rounded-sm border border-[#c3c4c7] bg-white px-4 py-12 text-center text-[13px] text-[#50575e]">
          Supabase is not configured in this environment.
        </div>
      ) : (
        <TaxonomyManager terms={data} />
      )}
    </div>
  );
}
