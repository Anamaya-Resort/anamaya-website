// Render at request time so CMS edits (testimonials, etc.) appear without a redeploy.
export const dynamic = "force-dynamic";

import VideoHero from "@/components/VideoHero";
import PressBar from "@/components/home/PressBar";
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

// Match v2: YouTube video on desktop (HD), mp4 fallback on mobile.
// Poster webp paints instantly; real video fades in when browser is idle.
const HERO_YOUTUBE_ID = "9d5jqBsUpWI";
const HERO_MP4 =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2025/01/Anamaya-Phone-Header.mp4";
const HERO_POSTER = "/yoga_retreat_costarica.webp";

export default function Home() {
  return (
    <>
      <VideoHero
        youtubeId={HERO_YOUTUBE_ID}
        mp4Src={HERO_MP4}
        poster={HERO_POSTER}
        overlayOpacity={15}
      />

      <PressBar />

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
