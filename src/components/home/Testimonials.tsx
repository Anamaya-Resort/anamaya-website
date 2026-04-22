// Server component: fetches the testimonial set by slug and passes to the
// client-side carousel. Which set to show is a prop, so the same section
// can be reused on /retreats, /ytt, /wellness, etc.

import TestimonialCarousel from "@/components/TestimonialCarousel";
import { getTestimonialSet } from "@/lib/testimonials";

const MANDALA_LEFT =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2020/02/mandala_lower-left_369.webp";
const MANDALA_RIGHT =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2018/12/mandala_upper-right-406.webp";

type Props = {
  setSlug?: string;
};

export default async function Testimonials({ setSlug = "homepage" }: Props) {
  const set = await getTestimonialSet(setSlug);
  const testimonials = set?.testimonials ?? [];
  const autoplayMs = set?.autoplay_ms ?? 6000;

  return (
    <section className="relative overflow-hidden bg-white px-6 py-20">
      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden h-96 w-96 md:block"
        style={{
          backgroundImage: `url(${MANDALA_LEFT})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom left",
          backgroundSize: "contain",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 right-0 hidden h-80 w-80 md:block"
        style={{
          backgroundImage: `url(${MANDALA_RIGHT})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top right",
          backgroundSize: "contain",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-semibold uppercase tracking-wider text-anamaya-olive-dark sm:text-4xl">
          Testimonials
        </h2>
        <div className="mx-auto mt-4 mb-12 h-0.5 w-16 bg-anamaya-olive-dark/40" />

        <TestimonialCarousel testimonials={testimonials} autoplayMs={autoplayMs} />
      </div>
    </section>
  );
}
