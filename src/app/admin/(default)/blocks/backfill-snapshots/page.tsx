import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import SnapshotBackfill from "./SnapshotBackfill";

export const dynamic = "force-dynamic";

export default async function BackfillSnapshotsPage() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("blocks")
    .select("id, slug, name, snapshot_url, type_slug")
    .order("type_slug")
    .order("name");
  const missing = (data ?? [])
    .filter((b) => !b.snapshot_url)
    .map((b) => ({ id: b.id as string, slug: b.slug as string, name: b.name as string }));

  return (
    <div className="px-8 py-6">
      <Link href="/admin/blocks" className="text-sm text-[#2271b1] hover:underline">
        ← Blocks
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-anamaya-charcoal">
        Generate missing previews
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-anamaya-charcoal/70">
        Preview snapshots are normally captured when a block is saved in the
        editor. Blocks created by an import or seed (blog posts, the Wild by
        Nature retreat, spa, travel, and the various defaults) were never opened,
        so they have no preview. This renders each one in isolation and captures
        it. Leave the tab focused while it runs; it goes one at a time.
      </p>
      <div className="mt-5">
        <SnapshotBackfill blocks={missing} />
      </div>
    </div>
  );
}
