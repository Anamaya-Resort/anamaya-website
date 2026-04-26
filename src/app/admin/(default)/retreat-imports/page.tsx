import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { batchExtractRetreats, clearAllStagedRetreats, extractRetreatToStaging } from "@/lib/imports/actions";
import { SubmitButton } from "./SubmitButton";
import { ConfirmSubmitButton } from "./ConfirmSubmitButton";

export const dynamic = "force-dynamic";
// Image fetches dominate runtime — 10 retreats × ~10 images each can
// exceed the default Vercel function timeout. 300s is the Pro max.
export const maxDuration = 300;

type StagingRow = {
  id: string;
  url_inventory_id: string;
  url_path: string;
  title: string | null;
  status: string;
  warnings: string[];
  ao_retreat_id: string | null;
  pushed_at: string | null;
  updated_at: string;
};

export default async function RetreatImportsIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const sb = supabaseServer();

  const { data: retreats } = await sb
    .from("url_inventory")
    .select("id, url, title, date_modified")
    .eq("source_site", "v2")
    .eq("post_type", "retreat")
    .neq("url", "https://anamayastg.wpenginepowered.com/retreats/")
    .order("date_modified", { ascending: false })
    .limit(200);

  const stagingQuery = sb
    .from("retreat_imports")
    .select("id, url_inventory_id, url_path, title, status, warnings, ao_retreat_id, pushed_at, updated_at")
    .order("updated_at", { ascending: false });
  if (status) stagingQuery.eq("status", status);
  const { data: staging } = await stagingQuery;

  const stagingByInv = new Map<string, StagingRow>();
  for (const s of (staging ?? []) as StagingRow[]) stagingByInv.set(s.url_inventory_id, s);

  async function extractOne(formData: FormData) {
    "use server";
    const id = String(formData.get("url_inventory_id") ?? "");
    if (!id) return;
    await extractRetreatToStaging(id);
    redirect(`/admin/retreat-imports/${id}`);
  }

  async function extractBatch(formData: FormData) {
    "use server";
    const limit = Math.min(50, Math.max(1, Number(formData.get("limit") ?? 10)));
    const includeStaged = formData.get("include_already_staged") === "1";
    await batchExtractRetreats({ limit, include_already_staged: includeStaged });
    redirect(`/admin/retreat-imports`);
  }

  async function clearAll() {
    "use server";
    await clearAllStagedRetreats();
    redirect(`/admin/retreat-imports`);
  }

  const counts = {
    total: retreats?.length ?? 0,
    staged: staging?.length ?? 0,
    pending: (staging ?? []).filter((s) => s.status === "pending_review").length,
    pushed: (staging ?? []).filter((s) => s.status === "pushed_to_ao").length,
    failed: (staging ?? []).filter((s) => s.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-anamaya-charcoal">Retreat Imports</h1>
        <p className="mt-1 text-sm text-anamaya-charcoal/70">
          Stage WP retreat pages into AnamayOS. Run extract on a row to parse its
          scraped HTML, import images, and stage the result for review.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-anamaya-charcoal/70">
          <span>{counts.total} retreats</span>
          <span>·</span>
          <span>{counts.staged} staged</span>
          <span>·</span>
          <span className="text-amber-700">{counts.pending} pending review</span>
          <span>·</span>
          <span className="text-anamaya-green">{counts.pushed} pushed</span>
          <span>·</span>
          <span className="text-red-600">{counts.failed} failed</span>
        </div>
      </header>

      <form
        action={extractBatch}
        className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Batch extract
          </label>
          <p className="mt-1 text-xs text-anamaya-charcoal/60">
            Pulls the most-recently-modified retreats and extracts them in series.
            Re-running on already-staged retreats is opt-in via the checkbox.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-wider text-anamaya-charcoal/70">How many</span>
          <input
            type="number"
            name="limit"
            defaultValue={10}
            min={1}
            max={50}
            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
          <input type="checkbox" name="include_already_staged" value="1" />
          Include already-staged
        </label>
        <SubmitButton
          pendingLabel="Extracting…"
          className="ml-auto whitespace-nowrap rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
        >
          Extract Batch
        </SubmitButton>
      </form>

      <form
        action={clearAll}
        className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3"
      >
        <div className="text-xs text-red-900">
          <strong>Clear All Staging</strong>
          <span className="ml-2 text-red-800/80">
            Deletes every row in <code>retreat_imports</code> so you can re-extract from a clean
            slate. Does not touch AnamayOS retreat data; image_imports stays so dedupe still works.
          </span>
        </div>
        <ConfirmSubmitButton
          pendingLabel="Clearing…"
          confirmMessage="Delete ALL retreat_imports rows? This cannot be undone — but you can always re-extract."
          className="whitespace-nowrap rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-700"
        >
          Clear All
        </ConfirmSubmitButton>
      </form>

      <ul className="grid grid-cols-1 gap-2">
        {(retreats ?? []).map((r) => {
          const s = stagingByInv.get(r.id);
          return (
            <li
              key={r.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-anamaya-charcoal">
                  {r.title ?? "(untitled)"}
                </div>
                <div className="truncate text-xs text-anamaya-charcoal/60">{r.url}</div>
              </div>
              <StatusBadge status={s?.status} warnings={s?.warnings.length ?? 0} />
              <div className="flex items-center gap-2">
                {s ? (
                  <Link
                    href={`/admin/retreat-imports/${r.id}`}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
                  >
                    Review
                  </Link>
                ) : null}
                <form action={extractOne}>
                  <input type="hidden" name="url_inventory_id" value={r.id} />
                  <SubmitButton
                    pendingLabel="Extracting…"
                    className="whitespace-nowrap rounded-full bg-anamaya-green px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
                  >
                    {s ? "Re-extract" : "Extract"}
                  </SubmitButton>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status, warnings }: { status?: string; warnings: number }) {
  if (!status) {
    return <span className="text-xs italic text-anamaya-charcoal/40">not staged</span>;
  }
  const color =
    status === "pushed_to_ao" ? "bg-anamaya-green/10 text-anamaya-green" :
    status === "approved"     ? "bg-anamaya-mint/30 text-anamaya-charcoal" :
    status === "failed"       ? "bg-red-50 text-red-700" :
    status === "skipped"      ? "bg-zinc-100 text-anamaya-charcoal/60" :
                                "bg-amber-50 text-amber-800";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {status.replace(/_/g, " ")}
      {warnings > 0 ? ` · ${warnings} warning${warnings === 1 ? "" : "s"}` : ""}
    </span>
  );
}
