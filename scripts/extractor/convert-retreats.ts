/**
 * Convert extracted retreats onto the "Retreat — Editorial" template.
 *
 * The first 15 conversions were hand-written SQL migrations, one block at
 * a time. That does not scale to the ~100 remaining legacy pages, so this
 * builds the same nine page_block_overrides rows straight from
 * retreat_imports.extracted_json and flips url_inventory.cms_template_id.
 *
 * Idempotent: overrides are upserted on (url_inventory_id, variant_block_id),
 * so re-running refreshes content rather than duplicating it. Every
 * url_inventory row that shares the slug is converted (v1 and v2 both), which
 * is what the hand-written migrations did too.
 *
 *   npx tsx scripts/extractor/convert-retreats.ts            # dry run
 *   npx tsx scripts/extractor/convert-retreats.ts --live
 *   npx tsx scripts/extractor/convert-retreats.ts --live --only=slug-a,slug-b
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEMPLATE_ID = "2c89c7ed-da33-44b7-9455-1a97bf75b512";

/** Fixed variant_block_ids of the template's nine slots. */
const VB = {
  hero: "144dbbd6-df8a-4bfe-9445-fa8abdc04278",
  title: "ea266e9c-2980-454b-b1a1-8eab474c3a77",
  rates: "ca30fa78-411b-434c-acfa-0996a9a70fcf",
  description: "c229572b-1c0d-446e-8c7c-f05b2852bb92",
  details: "f75bb99c-68a2-43a1-89d4-68bfca03fad5",
  workshopsPricing: "403e929f-18cd-4fde-a6e1-685237575195",
  workshopsDetails: "aa9b32a9-9236-45b4-b6ea-4b386021a0d4",
  gallery: "d384555b-4b04-4acc-8826-de4825a1ec0e",
  leader1: "45734b4c-b726-4800-ad19-2ea272bddb69",
  leader2: "4a08c4ca-1b80-4e05-871e-97f7dafe90f3",
} as const;

const LIVE = process.argv.includes("--live");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "")
  .replace("--only=", "")
  .split(",")
  .filter(Boolean);
/** The first 15 pages were converted by hand with curated bios and copy.
 *  Regenerating them from extracted_json would flatten that, so already
 *  converted pages are left alone unless --force says otherwise. */
const FORCE = process.argv.includes("--force");
/** Write ONLY the Retreat Details slot, leaving every other block as-is.
 *  Used to give the hand-curated pages the new section without replacing
 *  their curated copy with generated content. */
const DETAILS_ONLY = process.argv.includes("--details-only");

function env(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}
const web = (): SupabaseClient =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
const ao = (): SupabaseClient =>
  createClient(env("AO_SUPABASE_URL"), env("AO_SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

type Leader = { name?: string; role?: string; bio_html?: string; photo_url?: string };
type Workshop = {
  title?: string;
  is_price_note?: boolean;
  description_html?: string;
  price_single?: number | null;
  price_full?: number | null;
  session_count?: number | null;
  session_duration_minutes?: number | null;
};
type Extracted = {
  name?: string;
  tagline?: string;
  description_html?: string;
  dates_text?: string;
  retreat_details_html?: string;
  dates_start?: string;
  dates_end?: string;
  pricing_tiers?: { name?: string; price?: string; note?: string }[];
  retreat_leaders?: Leader[];
  workshops?: Workshop[];
  gallery_images?: { url: string; alt?: string }[];
};

function slugOf(urlPath: string): string {
  const m = /\/retreat\/([^/]+)/.exec(urlPath ?? "");
  return m ? m[1] : (urlPath ?? "").replace(/\/$/, "").split("/").pop() ?? "";
}

/** "$1,095" style label from the numbers the extractor produced. */
function priceLabel(w: Workshop): string {
  const single = w.price_single ?? null;
  const full = w.price_full ?? null;
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  if (single != null && full != null && single !== full) return `${fmt(single)}–${fmt(full)}`;
  const one = single ?? full;
  return one != null ? fmt(one) : "";
}

function workshopNote(w: Workshop): string | undefined {
  return w.session_duration_minutes ? `${w.session_duration_minutes}-minute workshop` : undefined;
}

/**
 * The long-form workshop section. Rows are skipped when they are a
 * package/offer price line, or when there is genuinely no copy for them —
 * an empty heading reads as a bug. Verified against source before
 * enabling this: of 6 description-less workshops across all 113 pages, 3
 * were package-price rows, 2 had copy the AI missed (now recovered by the
 * extractor) and only 1 was truly empty.
 */
function workshopsDetailHtml(ws: Workshop[]): string {
  return ws
    .filter((w) => !w.is_price_note && (w.description_html ?? "").trim().length > 0)
    .map((w) => {
      const bits: string[] = [`<h3>${w.title ?? ""}</h3>`];
      const note = workshopNote(w);
      const price = priceLabel(w);
      const line = [note, price].filter(Boolean).join(" &mdash; ");
      if (line) bits.push(`<p><em>${line}</em></p>`);
      if (w.description_html) bits.push(w.description_html);
      return bits.join("");
    })
    .join("");
}

function datesText(e: Extracted): string {
  if (e.dates_text) return e.dates_text;
  if (!e.dates_start) return "";
  const f = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  return e.dates_end ? `${f(e.dates_start)} – ${f(e.dates_end)}` : f(e.dates_start);
}

async function main() {
  const w = web();
  const a = ao();

  const { data: staged, error: sErr } = await w
    .from("retreat_imports")
    .select("id, url_path, title, extracted_json, ao_retreat_id")
    .order("created_at");
  if (sErr) throw new Error(`retreat_imports: ${sErr.message}`);

  const { data: inv, error: iErr } = await w
    .from("url_inventory")
    .select("id, url_path, source_site, cms_template_id")
    .eq("post_type", "retreat");
  if (iErr) throw new Error(`url_inventory: ${iErr.message}`);

  const invBySlug = new Map<string, typeof inv>();
  for (const row of inv ?? []) {
    const s = slugOf(row.url_path);
    if (!invBySlug.has(s)) invBySlug.set(s, []);
    invBySlug.get(s)!.push(row);
  }

  let converted = 0;
  let skipped = 0;

  for (const st of staged ?? []) {
    const slug = slugOf(st.url_path);
    if (ONLY.length > 0 && !ONLY.includes(slug)) continue;
    const e = (st.extracted_json ?? {}) as Extracted;
    const rows = invBySlug.get(slug) ?? [];
    if (!e.name || rows.length === 0) {
      console.log(`  skip ${slug}: ${!e.name ? "no name" : "no inventory row"}`);
      skipped++;
      continue;
    }
    if (!FORCE && !DETAILS_ONLY && rows.some((r) => r.cms_template_id)) {
      skipped++;
      continue;
    }

    // Booking link + live retreat id come from AnamayOS, which the push
    // already reconciled against Retreat Guru.
    let regLink: string | null = null;
    const leaderPersonIds: string[] = [];
    if (st.ao_retreat_id) {
      const { data: r } = await a
        .from("retreats")
        .select("registration_link, external_link")
        .eq("id", st.ao_retreat_id)
        .maybeSingle();
      regLink = r?.registration_link ?? r?.external_link ?? null;
      const { data: links } = await a
        .from("retreat_teachers")
        .select("person_id, is_primary, sort_order")
        .eq("retreat_id", st.ao_retreat_id)
        .order("sort_order");
      for (const l of links ?? []) leaderPersonIds.push(l.person_id);
    }

    const gallery = (e.gallery_images ?? []).filter((g) => g?.url);
    const hero = gallery[0]?.url ?? null;
    const leaders = (e.retreat_leaders ?? []).filter((l) => l?.name);
    const ws = (e.workshops ?? []).filter((x) => x?.title);

    const leaderContent = (idx: number) => {
      const l = leaders[idx];
      if (!l) return {};
      const c: Record<string, unknown> = {
        responsive_mode: "fixed",
        role: idx === 0 ? "Lead Teacher" : "Co-Teacher",
        name: l.name,
      };
      if (l.bio_html) c.bio_html = l.bio_html;
      if (l.photo_url) c.photo_url = l.photo_url;
      if (leaderPersonIds[idx]) c.ao_person_id = leaderPersonIds[idx];
      return c;
    };

    const content: Record<string, Record<string, unknown>> = {
      [VB.hero]: hero
        ? {
            image_url: hero,
            image_alt: e.name,
            image_fit: "cover",
            height_px: 560,
            overlay_opacity: 0,
            align: "center",
            corner_radius_px: 8,
          }
        : {},
      [VB.title]: { manual_title: e.name, ...(st.ao_retreat_id ? { retreat_id: st.ao_retreat_id } : {}) },
      [VB.rates]: {
        ...(st.ao_retreat_id ? { retreat_id: st.ao_retreat_id } : {}),
        heading: "Dates & Rates",
        manual_dates_text: datesText(e),
        manual_tiers: (e.pricing_tiers ?? []).map((t) => ({ name: t.name, price: t.price })),
        manual_cta_label: "Book Now",
        ...(regLink ? { manual_cta_href: regLink } : {}),
      },
      [VB.description]: e.description_html ? { html: e.description_html, padding_y_px: 48 } : {},
      [VB.details]: e.retreat_details_html
        ? { html: e.retreat_details_html, padding_y_px: 40 }
        : {},
      [VB.workshopsPricing]:
        ws.length > 0
          ? {
              // Several retreats include their workshops in the retreat price;
              // calling those "Optional Workshops" next to an empty price
              // column is misleading.
              heading: ws.some((x) => priceLabel(x) !== "") ? "Optional Workshops" : "Included Workshops",
              intro: "",
              tiers: ws.map((x) => {
                const t: Record<string, unknown> = { name: x.title, price: priceLabel(x) };
                const note = workshopNote(x);
                if (note) t.note = note;
                return t;
              }),
              padding_y_px: 32,
            }
          : {},
      [VB.workshopsDetails]:
        ws.some((x) => x.description_html) ? { html: workshopsDetailHtml(ws), padding_y_px: 24 } : {},
      [VB.gallery]:
        gallery.length > 0
          ? {
              images: gallery.map((g) => ({ url: g.url, alt: g.alt || e.name })),
              layout: "grid",
              columns: 3,
              lightbox: true,
              padding_y_px: 32,
            }
          : {},
      [VB.leader1]: leaderContent(0),
      [VB.leader2]: leaderContent(1),
    };

    const targets = rows.map((r) => r.id);
    console.log(
      `  ${LIVE ? "convert" : "would convert"} ${slug.slice(0, 46).padEnd(48)} rows=${targets.length} tiers=${(e.pricing_tiers ?? []).length} ws=${ws.length} gal=${gallery.length} leaders=${leaders.length}${leaderPersonIds.length ? ` (ao-linked ${leaderPersonIds.length})` : ""}`,
    );

    if (!LIVE) {
      converted++;
      continue;
    }

    const slots = DETAILS_ONLY
      ? Object.entries(content).filter(([vb]) => vb === VB.details)
      : Object.entries(content);
    const payload = targets.flatMap((id) =>
      slots.map(([vb, c]) => ({
        url_inventory_id: id,
        variant_block_id: vb,
        content: c,
      })),
    );
    const { error: oErr } = await w
      .from("page_block_overrides")
      .upsert(payload, { onConflict: "url_inventory_id,variant_block_id" });
    if (oErr) throw new Error(`overrides ${slug}: ${oErr.message}`);

    const { error: tErr } = await w
      .from("url_inventory")
      .update({ cms_template_id: TEMPLATE_ID })
      .in("id", targets);
    if (tErr) throw new Error(`cms_template_id ${slug}: ${tErr.message}`);
    converted++;
  }

  console.log(`\n${LIVE ? "converted" : "would convert"}: ${converted}   skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
