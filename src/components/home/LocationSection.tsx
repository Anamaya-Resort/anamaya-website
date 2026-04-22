// Static map image that links out to the interactive Google Maps page.
// Replaces the ~50+ requests / hundreds of KB that a live embed pulls.

import Link from "next/link";

const ANAMAYA_LAT = 9.6566781;
const ANAMAYA_LNG = -85.0655563;

// Google Maps "place" URL centered on Anamaya's actual clifftop coords.
const MAPS_LINK = `https://www.google.com/maps/place/Anamaya+Resort/@${ANAMAYA_LAT},${ANAMAYA_LNG},15z`;

const MAP_IMAGE = "/montezuma_map.webp";

export default function LocationSection() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-4xl font-semibold uppercase tracking-wider text-anamaya-charcoal sm:text-5xl">
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

        <Link
          href={MAPS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Anamaya Resort location in Google Maps"
          className="group relative block overflow-hidden rounded-lg shadow-lg ring-1 ring-anamaya-charcoal/10 transition-shadow hover:shadow-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_IMAGE}
            alt="Map showing Anamaya Resort in Montezuma, Costa Rica"
            width={1248}
            height={776}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
          <span className="absolute bottom-4 right-4 rounded-full bg-anamaya-charcoal/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white opacity-90 transition-opacity group-hover:opacity-100">
            View on Google Maps →
          </span>
        </Link>
      </div>
    </section>
  );
}
