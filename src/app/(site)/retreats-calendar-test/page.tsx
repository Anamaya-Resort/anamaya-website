import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import RetreatsCalendarBlock from "@/components/blocks/RetreatsCalendarBlock";

// The calendar reads live retreat data from AnamayOS on every request.
export const dynamic = "force-dynamic";

// Test/preview page — keep it out of search indexes.
export const metadata: Metadata = {
  title: "Retreats Calendar — Test",
  robots: { index: false, follow: false },
};

/**
 * Throwaway preview page so the owner can see the Retreats Calendar block
 * on a real site page (with the top bar + site theme), rather than in the
 * bare block-preview iframe. Renders the same block a template would.
 */
export default async function RetreatsCalendarTestPage() {
  return (
    <>
      {/* Real site chrome — same wordmark logos the spa/blog routes use. */}
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />

      <main className="min-h-screen bg-anamaya-cream pt-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-anamaya-green">
            Preview page
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-anamaya-charcoal">
            Retreats Calendar — test
          </h1>
          <p className="mt-2 text-sm italic text-anamaya-charcoal/60">
            A live look at the Retreats Calendar block, using real AnamayOS data.
          </p>
        </div>

        <RetreatsCalendarBlock
          content={{
            heading: "Upcoming Retreats",
            subheading: "Every retreat coming up at Anamaya, in date order.",
            group_by_month: true,
            book_label: "Book Now",
          }}
        />
      </main>

      {/* Right-anchored slide-out menu, opened by the top bar. Empty content
          falls back to the site's default nav. */}
      <UiSideMenuRightBlock content={{}} />
    </>
  );
}
