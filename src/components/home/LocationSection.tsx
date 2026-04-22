import DeferUntilVisible from "@/components/DeferUntilVisible";

// Coordinates lifted from the place pin (!3d / !4d) in the shared Maps URL —
// Anamaya's actual clifftop location above Montezuma Beach, not the village.
const ANAMAYA_LAT = 9.6566781;
const ANAMAYA_LNG = -85.0655563;
const MAPS_EMBED_SRC = `https://maps.google.com/maps?q=${ANAMAYA_LAT},${ANAMAYA_LNG}&z=15&output=embed`;

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
