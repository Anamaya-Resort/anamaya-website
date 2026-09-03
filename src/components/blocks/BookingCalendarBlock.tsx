import type { BookingCalendarContent } from "@/types/blocks";
import { getBookingCalendarData, type CalendarData } from "./booking-calendar/data";
import BookingCalendarView from "./booking-calendar/BookingCalendarView";

/**
 * Booking Calendar block — async server component. Fetches upcoming retreats
 * from AnamayOS (applying the block's gating: retreat type + only-available)
 * and renders the interactive tower + Saturday-to-Saturday calendar. Booking
 * hands off to Retreat Guru; we never handle payment.
 *
 * Placed on a template alongside the header/press blocks; one block powers
 * many filtered calendars (e.g. a YTT-only calendar on a YTT page).
 */
export default async function BookingCalendarBlock({
  content,
  preview,
}: {
  content: BookingCalendarContent;
  /** Admin block-preview only: render a small hardcoded sample instead of
   *  hitting AnamayOS (which isn't reachable in the preview iframe and would
   *  otherwise throw). Never set on public render paths. */
  preview?: boolean;
}) {
  if (preview) {
    return <BookingCalendarView data={SAMPLE_DATA} />;
  }
  const c = content ?? {};
  const data = await getBookingCalendarData({
    retreatType: c.retreat_type ?? "all",
    onlyAvailable: c.only_available === true,
  });
  return <BookingCalendarView data={data} />;
}

// Admin preview only: two sample retreats over a three-week Sat-to-Sat grid.
// Same-origin images so the snapshot canvas is never tainted; "#" links since
// there's no live Retreat Guru target in preview.
const SAMPLE_DATA: CalendarData = {
  retreats: [
    {
      id: "sample-1",
      title: "Sunrise Vinyasa Immersion",
      teacher: "Maya Sol",
      startISO: "2026-10-03",
      endISO: "2026-10-10",
      image: "/yoga_retreat_costarica.webp",
      blurb: "A week of morning flows, breathwork, and clifftop rest above the Pacific.",
      bookHref: "#",
      infoHref: "#",
      isSoldOut: false,
      waitlist: false,
      availableSpaces: 6,
      priceFrom: 1595,
      currency: "USD",
      isYtt: false,
    },
    {
      id: "sample-2",
      title: "Sound Healing Retreat",
      teacher: "Ravi Kestrel",
      startISO: "2026-10-10",
      endISO: "2026-10-17",
      image: "/costarica_wellness_retreats.webp",
      blurb: "Crystal bowls, guided meditation, and deep relaxation by the sea.",
      bookHref: "#",
      infoHref: "#",
      isSoldOut: false,
      waitlist: false,
      availableSpaces: null,
      priceFrom: null,
      currency: "USD",
      isYtt: false,
    },
  ],
  weeks: [
    {
      key: "2026-10-03",
      monthLabel: "October 2026",
      monthKey: "2026-9",
      startsNewMonth: true,
      days: [
        { iso: "2026-10-03", dayNum: 3, dayLetter: "S" },
        { iso: "2026-10-04", dayNum: 4, dayLetter: "S" },
        { iso: "2026-10-05", dayNum: 5, dayLetter: "M" },
        { iso: "2026-10-06", dayNum: 6, dayLetter: "T" },
        { iso: "2026-10-07", dayNum: 7, dayLetter: "W" },
        { iso: "2026-10-08", dayNum: 8, dayLetter: "T" },
        { iso: "2026-10-09", dayNum: 9, dayLetter: "F" },
        { iso: "2026-10-10", dayNum: 10, dayLetter: "S" },
      ],
      retreatIds: ["sample-1"],
    },
    {
      key: "2026-10-10",
      monthLabel: "October 2026",
      monthKey: "2026-9",
      startsNewMonth: false,
      days: [
        { iso: "2026-10-10", dayNum: 10, dayLetter: "S" },
        { iso: "2026-10-11", dayNum: 11, dayLetter: "S" },
        { iso: "2026-10-12", dayNum: 12, dayLetter: "M" },
        { iso: "2026-10-13", dayNum: 13, dayLetter: "T" },
        { iso: "2026-10-14", dayNum: 14, dayLetter: "W" },
        { iso: "2026-10-15", dayNum: 15, dayLetter: "T" },
        { iso: "2026-10-16", dayNum: 16, dayLetter: "F" },
        { iso: "2026-10-17", dayNum: 17, dayLetter: "S" },
      ],
      retreatIds: ["sample-2"],
    },
    {
      key: "2026-10-17",
      monthLabel: "October 2026",
      monthKey: "2026-9",
      startsNewMonth: false,
      days: [
        { iso: "2026-10-17", dayNum: 17, dayLetter: "S" },
        { iso: "2026-10-18", dayNum: 18, dayLetter: "S" },
        { iso: "2026-10-19", dayNum: 19, dayLetter: "M" },
        { iso: "2026-10-20", dayNum: 20, dayLetter: "T" },
        { iso: "2026-10-21", dayNum: 21, dayLetter: "W" },
        { iso: "2026-10-22", dayNum: 22, dayLetter: "T" },
        { iso: "2026-10-23", dayNum: 23, dayLetter: "F" },
        { iso: "2026-10-24", dayNum: 24, dayLetter: "S" },
      ],
      retreatIds: [],
    },
  ],
};
