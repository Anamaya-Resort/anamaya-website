import Link from "next/link";

export default function AccommodationsTeaser() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        {/* TODO: replace with a real accommodations photo from Supabase Storage */}
        <div
          className="h-80 w-full rounded-lg bg-gradient-to-br from-anamaya-teal to-anamaya-olive md:h-96"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-anamaya-charcoal sm:text-4xl">
            Accommodations
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-anamaya-charcoal/80">
            Rest and recharge at Anamaya. Our rooms are all uniquely designed
            using non-toxic materials and organic fabrics. Enjoy the comfort,
            incredible views, and prices to suit everyone&rsquo;s budget.
          </p>
          <Link
            href="/accommodations/"
            className="mt-8 inline-block rounded-full bg-anamaya-green px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            View Rooms
          </Link>
        </div>
      </div>
    </section>
  );
}
