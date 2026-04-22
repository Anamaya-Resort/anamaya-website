import DeferUntilVisible from "@/components/DeferUntilVisible";

const MAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.9737934912693!2d-85.07520392462253!3d9.657069779128657!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa1aa1c1a1a1a1a%3A0x1!2sMontezuma%2C+Puntarenas%2C+Costa+Rica!5e0!3m2!1sen!2sus!4v1700000000000";

export default function LocationSection() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold uppercase tracking-wider text-anamaya-charcoal sm:text-4xl">
            Location
          </h2>
          <div className="mt-4 h-0.5 w-16 bg-anamaya-green" />
          <p className="mt-6 text-lg leading-relaxed text-anamaya-charcoal/80">
            Montezuma is located in the southern Nicoya Peninsula of Costa Rica
            on the Pacific Ocean, just 25 minutes from Santa Teresa / Mal País.
            The Nicoya Peninsula has been designated one of the world&rsquo;s
            Blue Zones by author Dan Buettner — one of five areas in the world
            where people are known to live the longest and healthiest lives.
          </p>
          <p className="mt-4 text-base leading-relaxed text-anamaya-charcoal/70">
            From the moment of your arrival, you&rsquo;ll know you&rsquo;ve
            found a very magical place, and during your stay at Anamaya
            you&rsquo;ll discover more about the true gifts of life, about
            yourself, and a few secrets about longevity.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-anamaya-charcoal/10">
          <DeferUntilVisible
            minHeight={384}
            fallback={
              <div className="flex h-96 w-full items-center justify-center bg-anamaya-mint/30 text-sm text-anamaya-charcoal/60">
                Loading map…
              </div>
            }
          >
            <iframe
              title="Anamaya Resort location in Montezuma, Costa Rica"
              src={MAPS_EMBED_SRC}
              className="h-96 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </DeferUntilVisible>
        </div>
      </div>
    </section>
  );
}
