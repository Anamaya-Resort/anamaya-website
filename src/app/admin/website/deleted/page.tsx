import PageHeader from "../_components/PageHeader";
import { listAllTrashed } from "@/lib/website-builder/queries";
import DeletedListShell from "./DeletedListShell";

/**
 * Combined "Deleted" view — every trashed content row across all post types,
 * with per-row and bulk Restore / Purge. Mirrors the per-type list page's
 * shell (px-5 py-4 + PageHeader), but the table lives in a purpose-built
 * client component since it isn't scoped to a single post type.
 */
export default async function DeletedPage() {
  const rows = await listAllTrashed();

  return (
    <div className="px-5 py-4">
      <PageHeader title="Deleted" />
      <DeletedListShell rows={rows} />
    </div>
  );
}
