import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { extractRetreatToStaging, pushStagedRetreat } from "@/lib/imports/actions";
import type { ExtractedRetreat } from "@/lib/imports/retreat-extractor";
import { SubmitButton } from "../SubmitButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function RetreatImportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: url_inventory_id } = await params;
  const sb = supabaseServer();

  const [{ data: inv }, { data: staging }, { data: ci }] = await Promise.all([
    sb
      .from("url_inventory")
      .select("id, url, title")
      .eq("id", url_inventory_id)
      .maybeSingle(),
    sb
      .from("retreat_imports")
      .select("id, status, warnings, extracted_json, pushed_at, ao_retreat_id, updated_at, failure_reason")
      .eq("url_inventory_id", url_inventory_id)
      .maybeSingle(),
    sb
      .from("content_items")
      .select("scraped_body_html")
      .eq("url_inventory_id", url_inventory_id)
      .maybeSingle(),
  ]);
  const scrapedHtml = (ci as { scraped_body_html?: string } | null)?.scraped_body_html ?? "";

  if (!inv) notFound();
  const extracted = (staging?.extracted_json ?? null) as ExtractedRetreat | null;
  const stagingId = staging?.id ?? null;

  async function reExtract() {
    "use server";
    await extractRetreatToStaging(url_inventory_id);
    redirect(`/admin/retreat-imports/${url_inventory_id}`);
  }

  async function pushToAO() {
    "use server";
    if (!stagingId) return;
    await pushStagedRetreat(stagingId);
    redirect(`/admin/retreat-imports/${url_inventory_id}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/retreat-imports" className="text-xs text-anamaya-charcoal/60 hover:text-anamaya-charcoal">
            ← Retreat Imports
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-anamaya-charcoal">
            {inv.title ?? "(untitled)"}
          </h1>
          <a href={inv.url} target="_blank" rel="noreferrer" className="text-xs text-anamaya-charcoal/60 underline">
            {inv.url}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <form action={reExtract}>
            <SubmitButton
              pendingLabel="Extracting…"
              className="whitespace-nowrap rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
            >
              {staging ? "Re-extract" : "Extract"}
            </SubmitButton>
          </form>
          {staging && (
            <form action={pushToAO}>
              <SubmitButton
                pendingLabel="Pushing…"
                title={
                  staging.ao_retreat_id
                    ? "Update the existing retreat in AnamayOS"
                    : "Create a new retreat in AnamayOS"
                }
                className="whitespace-nowrap rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
              >
                {staging.ao_retreat_id ? "Re-push to AO" : "Push to AO"}
              </SubmitButton>
            </form>
          )}
        </div>
      </header>

      {!staging && (
        <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm italic text-anamaya-charcoal/60">
          Not staged yet. Click Extract to parse this page.
        </p>
      )}

      {staging && (
        <>
          <Status row={staging} />
          {(staging.warnings as string[]).length > 0 && <Warnings warnings={staging.warnings as string[]} />}
          {extracted && <ExtractedView data={extracted} />}
        </>
      )}

      {scrapedHtml && <ScrapedHtmlDebug html={scrapedHtml} />}
    </div>
  );
}

function ScrapedHtmlDebug({ html }: { html: string }) {
  return (
    <details className="rounded-md border border-zinc-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        Scraped HTML ({html.length.toLocaleString()} chars) — debug
      </summary>
      <p className="mt-2 text-xs text-anamaya-charcoal/60">
        The exact bytes the extractor parses. Use the browser&apos;s find-in-page (Cmd-F) to
        locate a section (e.g. &quot;Prices&quot;) when tuning the parser.
      </p>
      <pre className="mt-2 max-h-[600px] overflow-auto rounded bg-zinc-50 p-2 text-xs leading-tight text-anamaya-charcoal/80">
        {html}
      </pre>
    </details>
  );
}

function Status({ row }: { row: { status: string; updated_at: string; pushed_at: string | null; ao_retreat_id: string | null; failure_reason: string | null } }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm">
      <dl className="grid grid-cols-2 gap-y-1 sm:grid-cols-4">
        <dt className="text-xs uppercase tracking-wider text-anamaya-charcoal/60">Status</dt>
        <dd className="text-anamaya-charcoal">{row.status.replace(/_/g, " ")}</dd>
        <dt className="text-xs uppercase tracking-wider text-anamaya-charcoal/60">Last extracted</dt>
        <dd className="text-anamaya-charcoal">{new Date(row.updated_at).toLocaleString()}</dd>
        {row.pushed_at && (
          <>
            <dt className="text-xs uppercase tracking-wider text-anamaya-charcoal/60">Pushed</dt>
            <dd className="text-anamaya-charcoal">{new Date(row.pushed_at).toLocaleString()}</dd>
          </>
        )}
        {row.ao_retreat_id && (
          <>
            <dt className="text-xs uppercase tracking-wider text-anamaya-charcoal/60">AO retreat id</dt>
            <dd className="font-mono text-xs text-anamaya-charcoal">{row.ao_retreat_id}</dd>
          </>
        )}
      </dl>
      {row.failure_reason && (
        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">{row.failure_reason}</p>
      )}
    </section>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">
        Warnings ({warnings.length})
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </section>
  );
}

function ExtractedView({ data }: { data: ExtractedRetreat }) {
  return (
    <div className="space-y-4">
      <Card title="Basics">
        <Row label="Name" value={data.name} />
        {data.tagline && <Row label="Tagline" value={data.tagline} />}
        {data.location && <Row label="Location" value={data.location} />}
        {data.dates_text && (
          <Row label="Dates" value={`${data.dates_text} (${data.dates_start ?? "?"} → ${data.dates_end ?? "?"})`} />
        )}
      </Card>

      {data.retreat_leader && (
        <Card title="Retreat Leader">
          {data.retreat_leader.name && <Row label="Name" value={data.retreat_leader.name} />}
          {data.retreat_leader.credentials && (
            <Row label="Credentials" value={data.retreat_leader.credentials} />
          )}
          {data.retreat_leader.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.retreat_leader.photo_url}
              alt=""
              className="mt-2 h-32 w-32 rounded-lg object-cover"
            />
          )}
        </Card>
      )}

      {data.pricing_tiers.length > 0 && (
        <Card title={`Pricing Tiers (${data.pricing_tiers.length})`}>
          <ul className="space-y-1">
            {data.pricing_tiers.map((t, i) => (
              <li key={i} className="text-sm">
                <strong className="text-anamaya-charcoal">{t.name}</strong>
                <span className="ml-2 text-anamaya-charcoal/70">{t.price}</span>
                {t.note && <span className="ml-2 text-anamaya-charcoal/60">— {t.note}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.whats_included.length > 0 && (
        <Card title={`What's Included (${data.whats_included.length})`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-anamaya-charcoal/80">
            {data.whats_included.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
      )}

      {data.itinerary.length > 0 && (
        <Card title={`Itinerary (${data.itinerary.length} days)`}>
          <ul className="space-y-2">
            {data.itinerary.map((d, i) => (
              <li key={i} className="text-sm">
                <strong className="text-anamaya-charcoal">{d.day}</strong>
                {d.title !== d.day && <span className="ml-2 text-anamaya-charcoal">{d.title}</span>}
                {d.description && (
                  <p className="mt-1 text-anamaya-charcoal/70">{d.description.slice(0, 280)}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.workshops.length > 0 && (
        <Card title={`Workshops (${data.workshops.length})`}>
          <ul className="space-y-1 text-sm">
            {data.workshops.map((w, i) => (
              <li key={i}>
                <strong className="text-anamaya-charcoal">{w.title}</strong>
                {w.price && <span className="ml-2 text-anamaya-charcoal/70">{w.price}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.who_is_this_for_text && (
        <Card title="Who Is This For">
          <p className="whitespace-pre-line text-sm text-anamaya-charcoal/80">
            {data.who_is_this_for_text.slice(0, 600)}
          </p>
        </Card>
      )}

      {data.what_to_expect_text && (
        <Card title="What To Expect">
          <p className="whitespace-pre-line text-sm text-anamaya-charcoal/80">
            {data.what_to_expect_text.slice(0, 600)}
          </p>
        </Card>
      )}

      {data.gallery_images.length > 0 && (
        <Card title={`Gallery (${data.gallery_images.length} images)`}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {data.gallery_images.map((g, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.alt ?? ""} className="h-24 w-full rounded object-cover" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.testimonials.length > 0 && (
        <Card title={`Testimonials (${data.testimonials.length})`}>
          <ul className="space-y-2 text-sm">
            {data.testimonials.map((t, i) => (
              <li key={i} className="rounded border border-zinc-200 p-2">
                <p className="italic text-anamaya-charcoal/80">“{t.quote.slice(0, 280)}”</p>
                {t.author && <p className="mt-1 text-xs text-anamaya-charcoal/60">— {t.author}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-0.5 text-sm">
      <span className="text-xs uppercase tracking-wider text-anamaya-charcoal/60">{label}</span>
      <span className="text-anamaya-charcoal">{value}</span>
    </div>
  );
}
