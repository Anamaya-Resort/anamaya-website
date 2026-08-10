import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import BookingCalendar from "./BookingCalendar";
import { getBookingCalendarData } from "./data";

// Live retreat data from AnamayOS on every request.
export const dynamic = "force-dynamic";

// Test/preview page — keep it out of search indexes.
export const metadata: Metadata = {
  title: "Booking Calendar — Test",
  robots: { index: false, follow: false },
};

/**
 * Preview of the new booking-oriented calendar: a 2:3 info tower on the left
 * and a continuous Saturday-to-Saturday scrolling grid of retreats on the
 * right. Spots-left and price-from are read from AnamayOS (hidden until that
 * data is populated). Booking hands off to Retreat Guru.
 */
export default async function BookingCalendarTestPage() {
  const data = await getBookingCalendarData();

  return (
    <>
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />

      <main className="min-h-screen bg-anamaya-cream pt-24 pb-10">
        <div className="mx-auto mb-6 max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-anamaya-green">
            Preview page
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-anamaya-charcoal">
            Booking Calendar — test
          </h1>
        </div>

        <BookingCalendar data={data} />
      </main>

      <UiSideMenuRightBlock content={{}} />
    </>
  );
}
