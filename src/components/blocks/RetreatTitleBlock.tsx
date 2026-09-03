import type { RetreatTitleContent } from "@/types/blocks";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Resolved = { name: string | null; status: string | null };

/**
 * The status line is computed, never authored -- it reflects AnamayOS's
 * own dates/availability at render time so it can never go stale the
 * way a manually-typed "Sold Out" label would.
 */
function computeStatus(
  startISO: string | null,
  endISO: string | null,
  isSoldOut: boolean,
  availableSpaces: number | null,
): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (endISO && endISO < today) return "RETREAT HAS ENDED";
  if (startISO && startISO <= today && (!endISO || endISO >= today)) return "CURRENTLY IN PROGRESS";
  const full = isSoldOut || (availableSpaces != null && availableSpaces <= 0);
  if (full) return "RETREAT IS FULL";
  return null;
}

async function resolveLive(retreatId: string | undefined): Promise<Resolved | null> {
  const id = retreatId?.trim();
  if (!id || !UUID_RE.test(id)) return null;
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return null;

  const { data, error } = await ao
    .from("retreats")
    .select("name, start_date, end_date, is_sold_out, available_spaces")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  return {
    name: (data.name as string | null) ?? null,
    status: computeStatus(
      data.start_date as string | null,
      data.end_date as string | null,
      Boolean(data.is_sold_out),
      data.available_spaces as number | null,
    ),
  };
}

/**
 * Retreat Title — the retreat's name, and (below it) a live status line:
 * "Currently in Progress" / "Retreat Has Ended" / "Retreat Is Full", or
 * nothing at all when it's simply upcoming and bookable.
 */
export default async function RetreatTitleBlock({ content }: { content: RetreatTitleContent }) {
  const c = content ?? {};
  const live = await resolveLive(c.retreat_id);
  const title = live?.name || c.manual_title || "";
  if (!title) return null;
  const pad = c.padding_y_px ?? 32;

  return (
    <section className="w-full px-6 text-center" style={{ paddingTop: pad, paddingBottom: pad }}>
      <h1 className="font-heading text-4xl font-semibold text-anamaya-charcoal sm:text-5xl">
        {title}
      </h1>
      {live?.status && (
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-anamaya-terracotta">
          {live.status}
        </p>
      )}
    </section>
  );
}
