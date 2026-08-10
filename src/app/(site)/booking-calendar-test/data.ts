import "server-only";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { decodeEntities } from "@/lib/website-builder/decode";

/**
 * Data + week-grid model for the booking calendar.
 *
 * The calendar is a continuous stack of Saturday-to-Saturday week rows
 * (retreats run Sat->Sat), every week shown so it reads like a real
 * calendar. A retreat is repeated in every week row it overlaps. Pricing
 * and spots-left are read straight from AnamayOS — they're null today, so
 * those bits stay hidden until AO starts populating them (no code change
 * needed here when it does).
 *
 * Booking always hands off to Retreat Guru via the retreat's registration
 * link; we never handle payment.
 */

export type CalRetreat = {
  id: string;
  title: string;
  teacher: string | null;
  startISO: string;
  endISO: string;
  image: string | null;
  blurb: string | null;
  bookHref: string | null;
  isSoldOut: boolean;
  waitlist: boolean;
  availableSpaces: number | null; // null until AO populates it
  priceFrom: number | null; // null until AO populates it
  currency: string;
};

export type CalDay = {
  iso: string;
  dayNum: number;
  dayLetter: string;
};

export type CalWeek = {
  key: string; // week-start ISO (a Saturday)
  monthLabel: string; // e.g. "August 2026" (month the week starts in)
  monthKey: string; // "2026-7"
  startsNewMonth: boolean;
  days: CalDay[]; // 8 cells: Sat .. next Sat (overlap by the shared Sat)
  retreatIds: string[];
};

export type CalendarData = { retreats: CalRetreat[]; weeks: CalWeek[] };

const COLS =
  "id, name, excerpt, description, tagline, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link, is_sold_out, waitlist_enabled, available_spaces, curve_start_price, pricing_options, currency";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // Sun..Sat

// Parse at UTC noon so day-of-week / arithmetic never drifts across a TZ.
function toUTC(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`);
}
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
/** The Saturday on or before `d` (getUTCDay: 6 = Saturday). */
function saturdayOnOrBefore(d: Date): Date {
  const shift = (d.getUTCDay() - 6 + 7) % 7;
  return addDays(d, -shift);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Lowest finite positive price on a retreat, or null. AnamayOS stores
 * pricing_options as an OBJECT keyed by lodging id ({ "5": { price, ... } }),
 * one per room, so we min across the room prices.
 */
function priceFromRow(row: Record<string, unknown>): number | null {
  const curve = Number(row.curve_start_price);
  if (Number.isFinite(curve) && curve > 0) return curve;
  const opts = row.pricing_options;
  const list =
    Array.isArray(opts) ? opts : opts && typeof opts === "object" ? Object.values(opts) : [];
  const nums = list
    .map((o) => {
      const r = (o ?? {}) as Record<string, unknown>;
      return Number(r.price ?? r.amount ?? r.rate ?? r.base_price);
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? Math.min(...nums) : null;
}

/**
 * Best image URL. Prefer the AO-set feature_image_url; else read the `images`
 * bag, which AO stores as an OBJECT keyed by size ({ large: { url } }, ...).
 */
function pickImage(row: Record<string, unknown>): string | null {
  const feat = row.feature_image_url;
  if (typeof feat === "string" && feat) return feat;
  const imgs = row.images;
  if (imgs && typeof imgs === "object" && !Array.isArray(imgs)) {
    const bag = imgs as Record<string, unknown>;
    for (const k of ["large", "full", "medium", "thumbnail"]) {
      const size = bag[k] as Record<string, unknown> | undefined;
      if (size && typeof size.url === "string" && size.url) return size.url;
    }
  }
  if (Array.isArray(imgs) && imgs.length) {
    const first = imgs[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const u = (first as Record<string, unknown>).url ?? (first as Record<string, unknown>).src;
      if (typeof u === "string") return u;
    }
  }
  return null;
}

function stripHtml(s: string | null | undefined): string {
  // Strip tags, then DECODE entities (not drop them) so "&amp;" becomes "&".
  return decodeEntities((s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Split "Retreat Name - Teacher" on a spaced dash; word-hyphens are safe. */
function splitTeacher(name: string): { title: string; teacher: string | null } {
  const parts = name.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), teacher: parts.slice(1).join(" - ").trim() || null };
  }
  return { title: name.trim(), teacher: null };
}

export async function getBookingCalendarData(): Promise<CalendarData> {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return { retreats: [], weeks: [] };
  const today = isoOf(new Date());

  const { data, error } = await ao
    .from("retreats")
    .select(COLS)
    .eq("is_public", true)
    .eq("is_active", true)
    .eq("status", "confirmed")
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .limit(200);
  if (error || !data?.length) return { retreats: [], weeks: [] };

  const retreats: CalRetreat[] = data
    .filter((r) => r.start_date && r.end_date)
    .map((r) => {
      const row = r as Record<string, unknown>;
      const { title, teacher } = splitTeacher(decodeEntities(String(row.name ?? "Untitled retreat")));
      const spaces = Number(row.available_spaces);
      return {
        id: String(row.id),
        title,
        teacher,
        startISO: String(row.start_date).slice(0, 10),
        endISO: String(row.end_date).slice(0, 10),
        image: pickImage(row),
        blurb: stripHtml((row.tagline as string) || (row.excerpt as string) || (row.description as string)),
        bookHref: (row.registration_link as string) || (row.external_link as string) || null,
        isSoldOut: row.is_sold_out === true,
        waitlist: row.waitlist_enabled === true,
        availableSpaces: Number.isFinite(spaces) ? spaces : null,
        priceFrom: priceFromRow(row),
        currency: (row.currency as string) || "USD",
      };
    });

  if (!retreats.length) return { retreats: [], weeks: [] };

  // Week grid spanning the earliest start to the latest end, Sat->Sat.
  const minStart = retreats.reduce((m, r) => (r.startISO < m ? r.startISO : m), retreats[0].startISO);
  const maxEnd = retreats.reduce((m, r) => (r.endISO > m ? r.endISO : m), retreats[0].endISO);
  const firstSat = saturdayOnOrBefore(toUTC(minStart));
  const lastSat = saturdayOnOrBefore(toUTC(maxEnd));

  const weeks: CalWeek[] = [];
  let prevMonthKey = "";
  for (let d = firstSat; isoOf(d) <= isoOf(lastSat); d = addDays(d, 7)) {
    const startISO = isoOf(d);
    const endISO = isoOf(addDays(d, 7)); // next Saturday (exclusive edge for overlap)
    const days: CalDay[] = [];
    for (let i = 0; i <= 7; i++) {
      const cell = addDays(d, i);
      days.push({ iso: isoOf(cell), dayNum: cell.getUTCDate(), dayLetter: DAY_LETTERS[cell.getUTCDay()] });
    }
    // A retreat occupies this week if their spans overlap.
    const retreatIds = retreats
      .filter((r) => r.startISO < endISO && r.endISO > startISO)
      .map((r) => r.id);

    const monthKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    weeks.push({
      key: startISO,
      monthLabel: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      monthKey,
      startsNewMonth: monthKey !== prevMonthKey,
      days,
      retreatIds,
    });
    prevMonthKey = monthKey;
  }

  return { retreats, weeks };
}
