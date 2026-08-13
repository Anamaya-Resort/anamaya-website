import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import BookingCalendarBlock from "@/components/blocks/BookingCalendarBlock";

// The block reads live retreat data from AnamayOS on every request.
export const dynamic = "force-dynamic";

// Test/preview page — keep it out of search indexes.
export const metadata: Metadata = {
  title: "Booking Calendar — Test",
  robots: { index: false, follow: false },
};

/**
 * Thin preview of the Booking Calendar BLOCK (the calendar now lives in the
 * builder as a block; this page just renders it with default gating so it can
 * be viewed with site chrome). A real template will replace this.
 */
export default async function BookingCalendarTestPage() {
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
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-anamaya-green">
            Upcoming Retreats
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-anamaya-charcoal sm:text-5xl">
            Booking Calendar
          </h1>
        </div>

        <BookingCalendarBlock content={{}} />
      </main>

      <UiSideMenuRightBlock content={{}} />
    </>
  );
}
