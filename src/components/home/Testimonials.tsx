const TESTIMONIALS = [
  {
    quote:
      "My friends and I just returned from a week-long yoga retreat at Anamaya and I have had a difficult time finding words to describe how amazing the entire trip was! Not only did our retreat allow us to escape the stresses of our daily lives, but the memories with the new friends we made, the staff, and the people of Costa Rica will remain with me forever. The food was unbelievably fresh and good.",
    author: "Nadia C",
    source: "TripAdvisor, March 2012",
    headline: "Amazing Yoga and Surf Retreat",
  },
  {
    quote:
      "Upon arrival, we were immediately greeted by one of the gracious owners and the beautiful ocean, glimmering all around us. The view from the saltwater infinity pool or the yoga deck under a full moon will forever be burned in my memory. I WILL be back and I highly suggest making Anamaya a must-do on your travel itinerary!",
    author: "Meredith79",
    source: "TripAdvisor, January 2010",
    headline: "Anamaya has a piece of my heart",
  },
  {
    quote:
      "More than just a vacation — the views are breathtaking, the food was delicious, healthy, and fresh. Seriously the best food I've ever tasted in my life. You can get whatever you're seeking from this amazing retreat — whether it's complete bliss or adventure.",
    author: "TiffysGirls",
    source: "TripAdvisor, April 2012",
    headline: "Breathtaking Views – Gourmet Food – Great Staff",
  },
  {
    quote:
      "I have diet restrictions (gluten-free) and the team of chefs completely took care of me — truly gluten-free gourmet! When we found Anamaya we thought we might eat out a couple of nights in Montezuma. Well, after the first dinner we knew we didn't want to eat anywhere else. Every evening we looked forward to dinner.",
    author: "Vel122",
    source: "TripAdvisor",
    headline: "Gluten-Free Gourmet",
  },
  {
    quote:
      "Stunning location, incredible food, and the yoga instruction was world-class. Anamaya is a place that transforms you — I arrived tired and left renewed.",
    author: "Repeat Guest",
    source: "TripAdvisor",
    headline: "Stunning",
  },
  {
    quote:
      "A treasure in paradise. The attention to detail, the kindness of the staff, and the natural beauty are unmatched. I've recommended Anamaya to everyone I know.",
    author: "Happy Camper",
    source: "TripAdvisor",
    headline: "Treasure in Paradise",
  },
];

const MANDALA_LEFT =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2020/02/mandala_lower-left_369.webp";
const MANDALA_RIGHT =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2018/12/mandala_upper-right-406.webp";

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-white px-6 py-20">
      {/* Decorative mandalas (hidden on mobile), matching v2's layout */}
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

      <div className="relative mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold uppercase tracking-wider text-anamaya-olive-dark sm:text-4xl">
          Testimonials
        </h2>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-anamaya-olive-dark/40" />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-lg bg-anamaya-cream p-6 shadow-md ring-1 ring-anamaya-charcoal/10"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
                &ldquo;{t.headline}&rdquo;
              </h3>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-anamaya-charcoal/80">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-xs uppercase tracking-wider text-anamaya-charcoal/60">
                — {t.author}, {t.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
