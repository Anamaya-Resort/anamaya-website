import Link from "next/link";

/** WP-style page header: large title + small bordered "Add New" pill action. */
export default function PageHeader({
  title,
  addNew,
}: {
  title: string;
  addNew?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-[23px] font-normal leading-tight text-[#1d2327]">
        {title}
      </h1>
      {addNew && (
        <Link
          href={addNew.href}
          className="rounded-sm border border-[#2271b1] bg-white px-2 py-[1px] text-[13px] text-[#2271b1] hover:bg-[#f6fbfd] hover:text-[#135e96]"
        >
          {addNew.label}
        </Link>
      )}
    </div>
  );
}
