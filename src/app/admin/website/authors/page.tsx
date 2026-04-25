import Image from "next/image";
import { listAuthors } from "@/lib/website-builder/queries";
import PageHeader from "../_components/PageHeader";

export default async function AuthorsPage() {
  const authors = await listAuthors();

  return (
    <div className="px-5 py-4">
      <PageHeader title="Authors" />

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
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Name</th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">Slug</th>
              <th className="px-3 py-2 font-semibold text-[#2271b1]">
                Description
              </th>
              <th className="w-20 px-3 py-2 text-right font-semibold text-[#2271b1]">
                Posts
              </th>
            </tr>
          </thead>
          <tbody>
            {authors.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-12 text-center text-[#50575e]"
                >
                  No authors found.
                </td>
              </tr>
            ) : (
              authors.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-[#f0f0f1] align-top hover:bg-[#f6f7f7]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      disabled
                      aria-label={`Select ${a.display_name}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {a.avatar_url ? (
                        <Image
                          src={a.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[#dcdcde]" />
                      )}
                      <span className="font-semibold text-[#2271b1]">
                        {a.display_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[#50575e]">
                    {a.slug ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[#50575e]">
                    {a.description ? (
                      <span className="line-clamp-2">{a.description}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#2271b1]">
                    {a.post_count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[13px] text-[#50575e]">
        {authors.length} {authors.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
