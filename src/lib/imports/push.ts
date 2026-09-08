import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aoSupabaseAdmin } from "@/lib/ao-supabase";
import { supabaseServer } from "@/lib/supabase-server";
import type {
  ExtractedLeader,
  ExtractedRetreat,
  ExtractedTestimonial,
  ExtractedTier,
  ExtractedWorkshop,
  LeaderRole,
} from "./retreat-extractor";

const PLACEHOLDER_EMAIL_DOMAIN = "imported.anamaya.local";

export type PushResult = {
  retreat_imports_id: string;
  ao_retreat_id: string;
  created: boolean;
  warnings: string[];
};

/**
 * Push a staged retreat into AnamayOS. Idempotent on `retreat_imports`:
 * if `ao_retreat_id` is already set, updates that AO retreat in place
 * (replaces all child pricing-tier and media rows so removed entries
 * actually disappear). Otherwise inserts a new retreat.
 *
 * Original WP data on the website side is never modified.
 */
export async function pushStagedRetreatToAO(
  retreat_imports_id: string,
  reviewedBy: string | null = null,
): Promise<PushResult> {
  const ao = aoSupabaseAdmin();
  const sb = supabaseServer();
  const warnings: string[] = [];

  const { data: staging, error: stErr } = await sb
    .from("retreat_imports")
    .select("id, url_path, title, extracted_json, ao_retreat_id, status")
    .eq("id", retreat_imports_id)
    .maybeSingle();
  if (stErr) throw new Error(`retreat_imports read: ${stErr.message}`);
  if (!staging) throw new Error("retreat_imports row not found");

  const data = staging.extracted_json as ExtractedRetreat;
  if (!data?.name) throw new Error("staged record missing 'name'");

  const slug = deriveSlug(staging.url_path);

  // Only write fields the extraction actually recovered. The scraper
  // routinely returns nothing for dates, itinerary, what_is_included,
  // what_to_expect and who_is_this_for — and AO already holds correct
  // dates from Retreat Guru. Sending null/[] for those would wipe good
  // data and, in the case of dates, drop the retreat out of every
  // date-filtered calendar and website block.
  const whatToExpect =
    data.what_to_expect_text ?? (data.what_to_expect_html ? stripHtml(data.what_to_expect_html) : null);
  const whoIsThisFor =
    data.who_is_this_for_text ?? (data.who_is_this_for_html ? stripHtml(data.who_is_this_for_html) : null);

  const retreatRow: Record<string, unknown> = {
    name: data.name,
    website_slug: slug,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  if (data.tagline) retreatRow.tagline = data.tagline;
  if (data.location) retreatRow.location_name = data.location;
  // Dates are deliberately NOT pushed. Retreat Guru is the booking system
  // of record for them and the 4-hourly sync keeps AO matching it. The
  // scraped WordPress page is often a stale edition: "Survive and Thrive"
  // scrapes as 2027-03-06 while RG (and AO) correctly say 2027-02-27 —
  // 03-06 is actually Pura Vida Haven's week. Writing scraped dates would
  // reintroduce that error and drop retreats out of date-filtered blocks.
  if (data.dates_start || data.dates_end) {
    warnings.push(
      `scraped dates (${data.dates_start ?? "?"} to ${data.dates_end ?? "?"}) ignored — Retreat Guru is authoritative for dates`,
    );
  }
  if (data.whats_included?.length) retreatRow.what_is_included = data.whats_included;
  if (whatToExpect) retreatRow.what_to_expect = whatToExpect;
  if (whoIsThisFor) retreatRow.who_is_this_for = whoIsThisFor;
  if (data.itinerary?.length) retreatRow.itinerary = data.itinerary;

  let ao_retreat_id: string;
  let created = false;

  // AO already holds every retreat from the Retreat Guru sync, so a blind
  // insert here is how duplicates get made (it is exactly how AO ended up
  // with two "Art of Thriving" rows). If staging has no link yet, look for
  // the existing retreat this page describes before creating anything:
  // match on website_slug, then on the anamaya.com URL that the RG import
  // stores in program_info.alternate_url. Recurring retreats reuse one page
  // across years, so prefer the soonest UPCOMING edition.
  let linkedId = staging.ao_retreat_id as string | null;
  if (!linkedId) {
    linkedId = await findExistingAoRetreat(ao, slug, warnings);
  }

  if (linkedId) {
    const { error } = await ao
      .from("retreats")
      .update(retreatRow)
      .eq("id", linkedId);
    if (error) throw new Error(`retreats update: ${error.message}`);
    ao_retreat_id = linkedId;
  } else {
    const { data: inserted, error } = await ao
      .from("retreats")
      .insert(retreatRow)
      .select("id")
      .single();
    if (error) throw new Error(`retreats insert: ${error.message}`);
    ao_retreat_id = inserted.id;
    created = true;
  }

  await replacePricingTiers(ao, ao_retreat_id, data.pricing_tiers, warnings);
  await replaceGalleryMedia(ao, ao_retreat_id, data.gallery_images);
  const { primaryPersonId: leaderPersonId, idsByName: leaderIdsByName } = await upsertRetreatLeaders(
    ao,
    ao_retreat_id,
    data.retreat_leaders,
    warnings,
  );
  await replaceWorkshops(ao, ao_retreat_id, data.workshops, leaderPersonId, leaderIdsByName, warnings);
  await replaceTestimonials(ao, ao_retreat_id, data.testimonials, warnings);

  await sb
    .from("retreat_imports")
    .update({
      ao_retreat_id,
      status: "pushed_to_ao",
      pushed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", retreat_imports_id);

  return { retreat_imports_id, ao_retreat_id, created, warnings };
}

function deriveSlug(urlPath: string): string {
  try {
    const path = new URL(urlPath).pathname;
    const m = path.match(/\/retreat\/([^/]+)\/?$/);
    if (m) return m[1];
    return path.replace(/\/$/, "").split("/").pop() ?? "";
  } catch {
    return urlPath.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** "$1,234" → 1234, "Sold out" → null. */
function parsePriceNumeric(price: string): number | null {
  const m = price.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function replacePricingTiers(
  ao: SupabaseClient,
  retreatId: string,
  tiers: ExtractedTier[],
  warnings: string[],
): Promise<void> {
  await ao.from("retreat_pricing_tiers").delete().eq("retreat_id", retreatId);
  if (tiers.length === 0) return;

  const rows = tiers.map((t, i) => {
    const numeric = parsePriceNumeric(t.price);
    if (numeric == null) {
      warnings.push(
        `tier "${t.name}" price "${t.price}" could not be parsed as numeric — stored as 0 with original in description`,
      );
    }
    return {
      retreat_id: retreatId,
      name: t.name,
      tier_order: i,
      price: numeric ?? 0,
      currency: "USD",
      description: t.note ?? (numeric == null ? t.price : null),
      is_active: true,
    };
  });
  const { error } = await ao.from("retreat_pricing_tiers").insert(rows);
  if (error) throw new Error(`retreat_pricing_tiers insert: ${error.message}`);
}

async function replaceGalleryMedia(
  ao: SupabaseClient,
  retreatId: string,
  images: { url: string; alt?: string }[],
): Promise<void> {
  await ao
    .from("retreat_media")
    .delete()
    .eq("retreat_id", retreatId)
    .eq("purpose", "gallery");
  if (images.length === 0) return;

  const rows = images.map((img, i) => ({
    retreat_id: retreatId,
    url: img.url,
    media_type: "photo",
    purpose: "gallery",
    alt_text: img.alt ?? null,
    sort_order: i,
  }));
  const { error } = await ao.from("retreat_media").insert(rows);
  if (error) throw new Error(`retreat_media insert: ${error.message}`);
}

function nameSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

/**
 * Find or create person rows for every leader on the retreat, then upsert
 * retreat_leader_profiles + retreat_teachers links. Idempotent across re-pushes:
 * matches existing persons by full_name (case-insensitive) before creating
 * a new placeholder row. Placeholder emails use a reserved
 * `imported.anamaya.local` domain so admins can spot synthetic rows and
 * fix them before sending any communication.
 *
 * Returns the person_id of the primary leader (used as workshop payout
 * default) — falls back to the first co-leader, then any leader.
 */
async function upsertRetreatLeaders(
  ao: SupabaseClient,
  retreatId: string,
  leaders: ExtractedLeader[],
  warnings: string[],
): Promise<{ primaryPersonId: string | null; idsByName: Map<string, string> }> {
  await ao.from("retreat_teachers").delete().eq("retreat_id", retreatId);
  const idsByName = new Map<string, string>();
  if (leaders.length === 0) return { primaryPersonId: null, idsByName };

  let primaryPersonId: string | null = null;

  for (let i = 0; i < leaders.length; i++) {
    const leader = leaders[i];
    if (!leader.name) continue;
    const personId = await ensurePerson(ao, leader, warnings);
    if (!personId) continue;
    idsByName.set(leader.name.toLowerCase().replace(/\s+/g, " ").trim(), personId);

    await ao
      .from("retreat_leader_profiles")
      .upsert(
        {
          person_id: personId,
          public_bio: leader.bio_html ? stripHtml(leader.bio_html) : "",
          photo_url: leader.photo_url ?? null,
          is_active: true,
        },
        { onConflict: "person_id" },
      );

    const isPrimary = leader.role === "primary";
    const { error: tErr } = await ao.from("retreat_teachers").insert({
      retreat_id: retreatId,
      person_id: personId,
      role: aoLeaderRole(leader.role),
      is_primary: isPrimary,
      sort_order: i,
    });
    if (tErr) warnings.push(`retreat_teachers link failed for "${leader.name}": ${tErr.message}`);

    if (isPrimary && !primaryPersonId) primaryPersonId = personId;
  }

  // Fallback: if no leader had role=primary, treat the first one we
  // successfully linked as the de-facto primary so workshops/payout still
  // have an owner.
  if (!primaryPersonId) {
    const { data: firstTeacher } = await ao
      .from("retreat_teachers")
      .select("person_id")
      .eq("retreat_id", retreatId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    primaryPersonId = (firstTeacher as { person_id?: string } | null)?.person_id ?? null;
  }

  if (primaryPersonId) {
    await ao.from("retreats").update({ leader_person_id: primaryPersonId }).eq("id", retreatId);
  }

  return { primaryPersonId, idsByName };
}

/**
 * Map our extractor's role enum to AnamayOS's `retreat_teachers.role`
 * column. AO uses "lead" for the headline teacher and free-form strings
 * for the rest; keeping the discriminator faithful to extraction lets
 * the AO admin filter/display by role without losing data.
 */
function aoLeaderRole(role: LeaderRole): string {
  switch (role) {
    case "primary":   return "lead";
    case "co":        return "co_lead";
    case "guest":     return "guest";
    case "assistant": return "assistant";
  }
}

/**
 * Find an existing person by name or insert a new placeholder. Extracted
 * so multiple leaders can share the lookup logic.
 */
async function ensurePerson(
  ao: SupabaseClient,
  leader: ExtractedLeader,
  warnings: string[],
): Promise<string | null> {
  const fullName = leader.name.trim();
  const slug = nameSlug(fullName);
  const placeholderEmail = `imported-${slug}@${PLACEHOLDER_EMAIL_DOMAIN}`;

  const { data: existing } = await ao
    .from("persons")
    .select("id")
    .ilike("full_name", fullName)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  // The placeholder email is unique, and an earlier import may have created
  // this leader under a slightly different name spelling ("Chloe Haddad "
  // vs "Chloe Haddad"), which the name match above misses. Without this the
  // insert below fails on idx_persons_email and aborts the whole push.
  const { data: byEmail } = await ao
    .from("persons")
    .select("id")
    .eq("email", placeholderEmail)
    .limit(1)
    .maybeSingle();
  if (byEmail?.id) return byEmail.id;

  const { data: created, error } = await ao
    .from("persons")
    .insert({
      email: placeholderEmail,
      full_name: fullName,
      avatar_url: leader.photo_url ?? null,
      notes: "Imported from anamaya.com retreat page — replace placeholder email before sending any communication.",
    })
    .select("id")
    .single();
  if (error) {
    warnings.push(`could not create person "${fullName}": ${error.message}`);
    return null;
  }
  warnings.push(
    `created placeholder person "${fullName}" (email: ${placeholderEmail}). Replace email before any outbound communication.`,
  );
  return created.id;
}

async function replaceWorkshops(
  ao: SupabaseClient,
  retreatId: string,
  workshops: ExtractedWorkshop[],
  leaderPersonId: string | null,
  leaderIdsByName: Map<string, string>,
  warnings: string[],
): Promise<void> {
  await ao.from("retreat_workshops").delete().eq("retreat_id", retreatId);
  if (workshops.length === 0) return;

  const rows = workshops.map((w, i) => {
    // Prefer the AI-structured numeric price; fall back to parsing the
    // legacy `w.price` string if present.
    const price = w.price_full ?? parsePriceNumeric(w.price ?? "") ?? 0;
    // Match instructor by name to a leader person if possible; otherwise
    // fall back to the retreat's primary leader for payouts.
    const matchedInstructor = w.instructor_name
      ? leaderIdsByName.get(normalizeName(w.instructor_name))
      : undefined;
    return {
      retreat_id: retreatId,
      name: w.title,
      description: w.description_html ?? w.description ?? null,
      workshop_kind: "workshop",
      price,
      currency: w.currency ?? "USD",
      payout_person_id: matchedInstructor ?? leaderPersonId,
      sort_order: i,
      is_active: true,
    };
  });
  const { error } = await ao.from("retreat_workshops").insert(rows);
  if (error) throw new Error(`retreat_workshops insert: ${error.message}`);

  // The AO retreat_workshops table doesn't currently have columns for
  // session_count, session_duration_minutes, or price_single. Surface
  // any data we had to drop so the admin knows.
  const dropped = workshops.filter(
    (w) => w.session_count != null || w.session_duration_minutes != null || w.price_single != null,
  );
  if (dropped.length > 0) {
    warnings.push(
      `${dropped.length} workshop(s) had session_count/duration/price_single fields that are not yet stored in retreat_workshops — extend the AO schema to preserve them on push.`,
    );
  }
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Push scraped testimonials to `general_testimonials`. Skips ones with
 * no identified author (the table requires `person_name NOT NULL` and
 * "Anonymous" rows aren't useful). Requires AO_ORG_ID env var.
 */
async function replaceTestimonials(
  ao: SupabaseClient,
  retreatId: string,
  testimonials: ExtractedTestimonial[],
  warnings: string[],
): Promise<void> {
  const orgId = process.env.AO_ORG_ID;

  await ao
    .from("general_testimonials")
    .delete()
    .eq("retreat_id", retreatId);

  if (testimonials.length === 0) return;
  if (!orgId) {
    warnings.push(
      `${testimonials.length} testimonial(s) not pushed — set AO_ORG_ID env var to enable`,
    );
    return;
  }

  const withAuthor = testimonials.filter((t) => t.author);
  const skipped = testimonials.length - withAuthor.length;
  if (skipped > 0) {
    warnings.push(`${skipped} testimonial(s) skipped — no author identified`);
  }
  if (withAuthor.length === 0) return;

  const rows = withAuthor.map((t, i) => ({
    org_id: orgId,
    retreat_id: retreatId,
    person_name: t.author!,
    person_photo_url: t.photo_url ?? null,
    body: t.quote,
    sort_order: i,
    is_active: true,
  }));
  const { error } = await ao.from("general_testimonials").insert(rows);
  if (error) throw new Error(`general_testimonials insert: ${error.message}`);
}

/**
 * Find the AO retreat a scraped page describes, so a push updates it
 * instead of inserting a duplicate alongside the Retreat-Guru-synced row.
 * Returns null only when nothing plausible exists, in which case the
 * caller creates a genuinely new retreat.
 */
async function findExistingAoRetreat(
  ao: SupabaseClient,
  slug: string,
  warnings: string[],
): Promise<string | null> {
  if (!slug) return null;
  const today = new Date().toISOString().slice(0, 10);

  const pick = (rows: { id: string; start_date: string | null; end_date: string | null }[]) => {
    if (rows.length === 0) return null;
    const upcoming = rows
      .filter((r) => (r.end_date ?? "") >= today)
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
    if (upcoming.length > 0) return upcoming[0].id;
    const past = [...rows].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    return past[0].id;
  };

  const { data: bySlug } = await ao
    .from("retreats")
    .select("id, start_date, end_date")
    .eq("website_slug", slug)
    .eq("is_active", true);
  const slugHit = pick((bySlug ?? []) as { id: string; start_date: string | null; end_date: string | null }[]);
  if (slugHit) return slugHit;

  const { data: byUrl } = await ao
    .from("retreats")
    .select("id, start_date, end_date")
    .eq("is_active", true)
    .ilike("program_info->>alternate_url", `%/retreat/${slug}/%`);
  const urlHit = pick((byUrl ?? []) as { id: string; start_date: string | null; end_date: string | null }[]);
  if (urlHit) {
    warnings.push(`linked to existing AO retreat via program_info.alternate_url (slug "${slug}")`);
    return urlHit;
  }
  return null;
}
