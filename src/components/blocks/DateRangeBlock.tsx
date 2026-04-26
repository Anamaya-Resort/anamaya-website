import type { DateRangeContent } from "@/types/blocks";
import { resolveBrandColor } from "@/config/brand-tokens";

/**
 * Formatted date range with optional label. When start/end are missing
 * falls back to fallback_text — used for "year-round / dateless" retreats
 * where the legacy WP page shows "Custom dates available".
 */
export default function DateRangeBlock({ content }: { content: DateRangeContent }) {
  const bg = resolveBrandColor(content?.bg_color) ?? "transparent";
  const color = resolveBrandColor(content?.text_color);
  const align = content?.align ?? "center";
  const size = content?.size_px ?? 18;
  const pad = content?.padding_y_px ?? 16;

  const formatted = formatDateRange(content?.start_date, content?.end_date);
  const display = formatted ?? content?.fallback_text;
  if (!display) return null;

  return (
    <section
      className="w-full"
      style={{ backgroundColor: bg, color, paddingTop: pad, paddingBottom: pad }}
    >
      <div
        className="mx-auto w-full max-w-[1200px] px-6"
        style={{ textAlign: align, fontSize: size }}
      >
        {content?.label && <span className="font-semibold">{content.label} </span>}
        <span>{display}</span>
      </div>
    </section>
  );
}

function formatDateRange(start: string | undefined, end: string | undefined): string | null {
  if (!start && !end) return null;
  const s = start ? parseDate(start) : null;
  const e = end ? parseDate(end) : null;
  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();
    if (sameMonth) {
      return `${monthName(s)} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    }
    if (sameYear) {
      return `${monthName(s)} ${s.getDate()} – ${monthName(e)} ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${monthName(s)} ${s.getDate()}, ${s.getFullYear()} – ${monthName(e)} ${e.getDate()}, ${e.getFullYear()}`;
  }
  if (s) return `${monthName(s)} ${s.getDate()}, ${s.getFullYear()}`;
  if (e) return `${monthName(e)} ${e.getDate()}, ${e.getFullYear()}`;
  return null;
}

function parseDate(iso: string): Date | null {
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthName(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}
