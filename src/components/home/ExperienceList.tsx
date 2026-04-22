import Link from "next/link";

const BULLETS = [
  "Sunrise yoga overlooking epic ocean views",
  "Sunset yoga after a day of fun",
  "Massage and spa services",
  "Salt-water infinity pool",
  "Organic food with vegetarian, vegan, and gluten-free options",
  "Free-range organic chicken and fresh fish available",
  "Free wireless high-speed internet",
  "A wonderful place for a yoga honeymoon",
  "Guest performances — fire-dancers, aerial / silk trapeze acts, musical performances, kirtans, and more",
  "Costa Rica adventure tours bookable at reception: surfing lessons, canopy tours, horseback riding, nature hikes, ATV tours, snorkeling, scuba diving, sea kayaking",
  "Infrared sauna and ice-bath wellness services",
];

export default function ExperienceList() {
  return (
    <section className="bg-anamaya-cream px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-4xl font-semibold uppercase tracking-wider text-anamaya-charcoal sm:text-5xl">
          Yoga and So Much More at Anamaya
        </h2>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-anamaya-green" />
        <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {BULLETS.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 text-base leading-relaxed text-anamaya-charcoal/90"
            >
              <span
                className="mt-2 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-anamaya-green"
                aria-hidden="true"
              />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-12 text-center">
          <Link
            href="/retreats/"
            className="inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            View Retreat Options
          </Link>
        </div>
      </div>
    </section>
  );
}
