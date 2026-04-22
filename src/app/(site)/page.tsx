// Render at request time so CMS edits appear without a redeploy.
// The [#...] blocks below are fully server-rendered — their HTML (text,
// logos, schema.org JSON-LD) is in the SSR response for SEO.
export const dynamic = "force-dynamic";

import Shortcode from "@/components/blocks/Shortcode";
import IntroSection from "@/components/home/IntroSection";
import BookingSection from "@/components/home/BookingSection";
import FeaturedRetreats from "@/components/home/FeaturedRetreats";
import HostRetreatCTA from "@/components/home/HostRetreatCTA";
import CustomizeCards from "@/components/home/CustomizeCards";
import AccommodationsTeaser from "@/components/home/AccommodationsTeaser";
import Newsletter from "@/components/home/Newsletter";
import LocationSection from "@/components/home/LocationSection";
import ExperienceList from "@/components/home/ExperienceList";
import ExperienceVideo from "@/components/home/ExperienceVideo";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
    <>
      {/* [#hero_vid_1] — homepage hero. Edit at /admin/blocks. */}
      <Shortcode slug="hero_vid_1" />

      {/* [#press_bar_1] — "Recommended by" logo row. */}
      <Shortcode slug="press_bar_1" />

      <IntroSection />
      <BookingSection />
      <FeaturedRetreats />
      <HostRetreatCTA />
      <CustomizeCards />
      <AccommodationsTeaser />
      <Newsletter />
      <LocationSection />
      <ExperienceList />
      <ExperienceVideo />
      <Testimonials />
    </>
  );
}
