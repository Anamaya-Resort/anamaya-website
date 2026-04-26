import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aoSupabaseAdmin } from "@/lib/ao-supabase";
import { supabaseServer } from "@/lib/supabase-server";
import type {
  ExtractedRetreat,
  ExtractedTestimonial,
  ExtractedTier,
  ExtractedWorkshop,
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

  const retreatRow = {
    name: data.name,
    tagline: data.tagline ?? null,
    start_date: data.dates_start ?? null,
    end_date: data.dates_end ?? null,
    location_name: data.location ?? null,
    what_is_included: data.whats_included ?? [],
    what_to_expect: data.what_to_expect_text ?? (data.what_to_expect_html ? stripHtml(data.what_to_expect_html) : null),
    who_is_this_for: data.who_is_this_for_text ?? (data.who_is_this_for_html ? stripHtml(data.who_is_this_for_html) : null),
    itinerary: data.itinerary ?? [],
    website_slug: slug,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let ao_retreat_id: string;
  let created = false;

  if (staging.ao_retreat_id) {
    const { error } = await ao
      .from("retreats")
      .update(retreatRow)
      .eq("id", staging.ao_retreat_id);
    if (error) throw new Error(`retreats update: ${error.message}`);
    ao_retreat_id = staging.ao_retreat_id;
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
  const leaderPersonId = await upsertRetreatLeader(ao, ao_retreat_id, data.retreat_leader, warnings);
  await replaceWorkshops(ao, ao_retreat_id, data.workshops, leaderPersonId);
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
 * Find or create a person row for the retreat leader, then upsert the
 * teacher_profiles + retreat_teachers rows. Idempotent across re-pushes:
 * matches an existing person by full_name (case-insensitive) before
 * creating a new placeholder row. Placeholder emails use a reserved
 * `imported.anamaya.local` domain so admins can spot synthetic rows and
 * fix them before sending any communication.
 */
async function upsertRetreatLeader(
  ao: SupabaseClient,
  retreatId: string,
  leader: ExtractedRetreat["retreat_leader"],
  warnings: string[],
): Promise<string | null> {
  await ao.from("retreat_teachers").delete().eq("retreat_id", retreatId);
  if (!leader?.name) return null;

  const fullName = leader.name.trim();
  const slug = nameSlug(fullName);
  const placeholderEmail = `imported-${slug}@${PLACEHOLDER_EMAIL_DOMAIN}`;

  const { data: existing } = await ao
    .from("persons")
    .select("id, email")
    .ilike("full_name", fullName)
    .limit(1)
    .maybeSingle();

  let personId: string;
  if (existing?.id) {
    personId = existing.id;
  } else {
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
      warnings.push(`could not create retreat-leader person "${fullName}": ${error.message}`);
      return null;
    }
    personId = created.id;
    warnings.push(
      `created placeholder person "${fullName}" (email: ${placeholderEmail}). Replace email before any outbound communication.`,
    );
  }

  await ao
    .from("teacher_profiles")
    .upsert(
      {
        person_id: personId,
        public_bio: leader.bio_html ? stripHtml(leader.bio_html) : "",
        photo_url: leader.photo_url ?? null,
        is_active: true,
      },
      { onConflict: "person_id" },
    );

  const { error: tErr } = await ao.from("retreat_teachers").insert({
    retreat_id: retreatId,
    person_id: personId,
    role: "lead",
    is_primary: true,
    sort_order: 0,
  });
  if (tErr) warnings.push(`retreat_teachers link failed: ${tErr.message}`);

  await ao.from("retreats").update({ leader_person_id: personId }).eq("id", retreatId);

  return personId;
}

async function replaceWorkshops(
  ao: SupabaseClient,
  retreatId: string,
  workshops: ExtractedWorkshop[],
  leaderPersonId: string | null,
): Promise<void> {
  await ao.from("retreat_workshops").delete().eq("retreat_id", retreatId);
  if (workshops.length === 0) return;

  const rows = workshops.map((w, i) => ({
    retreat_id: retreatId,
    name: w.title,
    description: w.description ?? null,
    workshop_kind: "workshop",
    price: parsePriceNumeric(w.price ?? "") ?? 0,
    currency: "USD",
    payout_person_id: leaderPersonId,
    sort_order: i,
    is_active: true,
  }));
  const { error } = await ao.from("retreat_workshops").insert(rows);
  if (error) throw new Error(`retreat_workshops insert: ${error.message}`);
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
