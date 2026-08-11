import type { BookingCalendarContent } from "@/types/blocks";
import { getBookingCalendarData } from "./booking-calendar/data";
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
}: {
  content: BookingCalendarContent;
}) {
  const c = content ?? {};
  const data = await getBookingCalendarData({
    retreatType: c.retreat_type ?? "all",
    onlyAvailable: c.only_available === true,
  });
  return <BookingCalendarView data={data} />;
}
