import PageHeader from "../_components/PageHeader";

export default function RedirectsPage() {
  return (
    <div className="px-5 py-4">
      <PageHeader title="Redirects" />

      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7] text-left">
              <th className="w-8 px-3 py-2">
                <input type="checkbox" disabled className="h-4 w-4" />
              </th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">
                Source URL
              </th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">
                Target URL
              </th>
              <th className="w-20 px-3 py-2 font-semibold text-[#2271b1]">
                Type
              </th>
              <th className="w-20 px-3 py-2 text-right font-semibold text-[#2271b1]">
                Hits
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                className="px-3 py-12 text-center text-[#50575e]"
              >
                No redirects defined yet — table will be created in Phase 4.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
