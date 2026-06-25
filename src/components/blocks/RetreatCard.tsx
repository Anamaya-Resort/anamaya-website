import Link from "next/link";
import { decodeEntities } from "@/lib/website-builder/decode";

/**
 * Shared retreat card + formatting helpers used by both the
 * FeaturedRetreats block (curated + backfill) and the FeaturedBySearch
 * block (AI-ranked). Keeping the card in one place means the two blocks
 * always look identical; each block only owns its data source + section
 * chrome.
 */

export type RetreatCardData = {
  id: string;
  name: string | null;
  excerpt: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  feature_image_url: string | null;
  images: unknown;
  website_slug: string | null;
  registration_link: string | null;
  external_link: string | null;
};

export type RetreatCardOptions = {
  urlPattern: string;
  registerLabel: string;
  headingColor?: string;
  cardBg?: string | null;
  cardBorder?: string | null;
  cardBorderWidth: number;
  cardRadius: number;
};

export function RetreatCard({
  r,
  opts,
}: {
  r: RetreatCardData;
  opts: RetreatCardOptions;
}) {
  const href = retreatHref(r, opts.urlPattern);
  const title = decodeEntities(r.name ?? "Untitled retreat");
  const dates = formatDateRange(r.start_date, r.end_date);
  const body = decodeEntities(stripHtml(r.excerpt ?? r.description ?? ""));
  const image = pickImage(r);

  return (
    <li>
      {/* Image-left / text-right card; fixed desktop height so both grid
          columns share the row height and the image fills its cell. */}
      <article
        className="grid grid-cols-1 gap-6 overflow-hidden border-solid border-anamaya-mint bg-white/40 md:h-[264px] md:grid-cols-[2fr_3fr]"
        style={{
          borderWidth: opts.cardBorderWidth,
          borderRadius: opts.cardRadius,
          ...(opts.cardBg ? { backgroundColor: opts.cardBg } : null),
          ...(opts.cardBorder ? { borderColor: opts.cardBorder } : null),
        }}
      >
        <Link
          href={href}
          className="group relative block h-[264px] overflow-hidden bg-anamaya-charcoal/5 md:h-full"
          aria-label={title}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs italic opacity-50">
              No image
            </div>
          )}
        </Link>
        <div className="flex min-w-0 flex-col gap-3 p-6">
          <Link href={href} className="block">
            <h3
              className="font-heading text-2xl font-semibold leading-tight hover:opacity-80"
              style={{ color: opts.headingColor }}
            >
              {title}
            </h3>
          </Link>
          {dates && (
            <div className="text-sm font-semibold tracking-wide opacity-80">
              {dates}
            </div>
          )}
          {body && (
            <p className="line-clamp-2 text-[15px] leading-relaxed opacity-90">
              {body}
            </p>
          )}
          <div className="mt-auto flex justify-end pt-2">
            <Link
              href={href}
              className="inline-block rounded-full bg-anamaya-green px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
            >
              {opts.registerLabel}
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

/**
 * Build the public URL for a retreat. Prefers the website_slug pattern
 * over external links so users land on our own page; falls back to AO's
 * registration_link / external_link only when no slug exists.
 */
export function retreatHref(r: RetreatCardData, pattern: string): string {
  if (r.website_slug) {
    return pattern.replace(/\{slug\}/g, r.website_slug);
  }
  return r.registration_link || r.external_link || "#";
}

/**
 * Pull the main image. Tries feature_image_url, then the per-size
 * variants AO stores under named keys, then a legacy array shape.
 */
export function pickImage(r: RetreatCardData): string | null {
  if (r.feature_image_url) return r.feature_image_url;

  if (r.images && typeof r.images === "object" && !Array.isArray(r.images)) {
    const sized = r.images as Record<string, unknown>;
    for (const key of ["large", "full", "medium", "thumbnail"]) {
      const entry = sized[key];
      if (entry && typeof entry === "object" && "url" in entry) {
        const url = (entry as { url?: unknown }).url;
        if (typeof url === "string" && url) return url;
      }
    }
  }

  if (Array.isArray(r.images) && r.images.length > 0) {
    const first = r.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url?: unknown }).url;
      if (typeof url === "string") return url;
    }
  }
  return null;
}

export function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/** Strip HTML tags and collapse whitespace, leaving plain prose. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format a date range like "May 16 - 23, 2026", "May 16 - June 2, 2026",
 * or "Dec 28, 2025 - Jan 3, 2026". Returns "" for missing/invalid dates.
 */
export function formatDateRange(
  startIso: string | null,
  endIso: string | null,
): string {
  if (!startIso) return "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const end = endIso ? new Date(endIso) : null;
  if (end && Number.isNaN(end.getTime())) return "";

  const fmtMonthDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const fmtMonthDayYear = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric" });

  if (!end) return `${fmtMonthDay(start)}, ${start.getFullYear()}`;

  if (start.getFullYear() !== end.getFullYear()) {
    return `${fmtMonthDayYear(start)} - ${fmtMonthDayYear(end)}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${fmtMonthDay(start)} - ${fmtDay(end)}, ${start.getFullYear()}`;
  }
  return `${fmtMonthDay(start)} - ${fmtMonthDay(end)}, ${start.getFullYear()}`;
}
