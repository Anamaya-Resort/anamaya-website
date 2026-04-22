import Link from "next/link";

export default function IntroSection() {
  return (
    <section className="bg-white px-6 py-20 text-center">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-anamaya-charcoal sm:text-5xl">
          ANAMAYA™: Your Transformational
          <br className="hidden sm:inline" /> Experience Awaits
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-anamaya-charcoal/80">
          At Anamaya Resort & Retreat Center we offer customizable in-house
          wellness and yoga retreats, Yoga Teacher Trainings, and a sacred
          space for others to host their own retreats in Costa Rica.
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-anamaya-charcoal/70">
          Welcome to Anamaya Resort – a premier destination for yoga retreats,
          teacher trainings, and transformational wellness in Costa Rica.
          Nestled in the lush jungle above Montezuma, Anamaya offers a variety
          of experiences to support your personal evolution — from customizable
          wellness retreats to immersive Yoga Teacher Trainings and specialized
          retreats led by world-class facilitators.
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-anamaya-charcoal/70">
          Enjoy organic meals, luxurious spa treatments, health and wellness
          workshops, and unforgettable excursions. Whether you&rsquo;re seeking
          deep rest, spiritual growth, or adventure, Anamaya is your place to
          reset, recharge, and reconnect with yourself in one of Costa
          Rica&rsquo;s most beautiful settings.
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-base italic leading-relaxed text-anamaya-olive">
          Anamaya means &ldquo;freedom from disease&rdquo; in Sanskrit and we
          take that very seriously.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/rg-calendar/"
            className="rounded-full bg-anamaya-green px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            View Retreat Calendar
          </Link>
          <Link
            href="/retreats/"
            className="rounded-full border-2 border-anamaya-charcoal px-8 py-3 text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal transition-colors hover:bg-anamaya-charcoal hover:text-white"
          >
            Explore Retreats
          </Link>
        </div>
      </div>
    </section>
  );
}
