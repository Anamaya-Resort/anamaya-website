// Render at request time so CMS edits appear without a redeploy.
// The [#...] blocks below are fully server-rendered — their HTML (text,
// logos, schema.org JSON-LD) is in the SSR response for SEO.
export const dynamic = "force-dynamic";

import Shortcode from "@/components/blocks/Shortcode";
import TemplateRenderer from "@/components/templates/TemplateRenderer";
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
import { supabaseServerOrNull } from "@/lib/supabase-server";

const SOURCE_SITE = "v2";
const PUBLIC_STATUSES = ["publish", "private"];

/**
 * Fetch the homepage inventory row, if any. Multiple homepages may
 * exist eventually (for split-testing); for now we pick the first
 * matching row deterministically by date_published. Returns null on
 * any failure so the page silently falls back to the static markup.
 */
async function findActiveHomepage(): Promise<{
  id: string;
  cms_template_id: string | null;
} | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;
  const { data, error } = await sb
    .from("url_inventory")
    .select("id, cms_template_id")
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", "homepage")
    .in("wp_status", PUBLIC_STATUSES)
    .order("date_published", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export default async function Home() {
  const homepage = await findActiveHomepage();

  // Once the admin wires the homepage to a CMS template, the catch-all
  // template pipeline takes over. Until then, the static markup below
  // keeps the live site looking exactly the way it does today.
  if (homepage?.cms_template_id) {
    return (
      <TemplateRenderer
        templateId={homepage.cms_template_id}
        pageId={homepage.id}
      />
    );
  }

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
