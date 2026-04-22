// "RECOMMENDED BY:" press logos bar.
// Sits BELOW the video hero. Muted-teal bg matching v2 (rgba(122,165,158,0.8)).
//
// Layout:
//   - "Recommended by:" label
//   - National Geographic centered on its own top row (featured)
//   - 8 remaining logos in ONE uniform row (grid-cols-8 on desktop;
//     wraps to 4 cols on narrow screens to stay readable)
// Every other logo shares the same slot height so they balance regardless
// of their native aspect ratios.

import Link from "next/link";

type Logo = {
  name: string;
  src: string;
  width: number;
  height: number;
  href: string | null;
};

const SUPA =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images";

const NAT_GEO: Logo = {
  name: "National Geographic",
  src: `${SUPA}/v2/2026/03/national-geographic-black-512px.webp`,
  width: 512,
  height: 151,
  href: "https://www.nationalgeographic.com/travel/best-of-the-world-2026/article/best-wellness-destinations",
};

// Exactly 8 logos below — 4 visually left of where NatGeo sat, 4 right.
const LOGOS: Logo[] = [
  {
    name: "Condé Nast Traveler",
    src: `${SUPA}/v2/2019/11/logo.webp`,
    width: 1056, height: 326,
    href: null, // matches v2 — first slot unlinked
  },
  {
    name: "National Post",
    src: `${SUPA}/v2/2021/09/nationalpost.webp`,
    width: 600, height: 100,
    href: "https://nationalpost.com/travel/salutation-to-the-fun-chill-out-in-a-good-way-on-a-costa-rican-yoga-retreat-2",
  },
  {
    name: "Elle",
    src: `${SUPA}/v2/2018/12/elle-1.webp`,
    width: 600, height: 217,
    href: "https://www.elle.com/es/living/viajes/news/a620018/viajes-para-yoguis/",
  },
  {
    name: "Forbes",
    src: `${SUPA}/v2/2019/11/forbes.webp`,
    width: 713, height: 179,
    href: "https://www.forbes.com/sites/annabel/2019/08/20/5-yoga-retreats-to-book-for-fall-2019/",
  },
  {
    name: "The Independent",
    src: `${SUPA}/v2/2019/11/independent.webp`,
    width: 1563, height: 142,
    href: "https://www.independent.co.uk/travel/hotels/the-big-six-central-american-boutique-hotels-1869092.html",
  },
  {
    name: "Travel + Leisure",
    src: `${SUPA}/v2/2026/03/travel-and-leisure-logo-whitetransp.webp`,
    width: 465, height: 108,
    href: "https://www.travelandleisure.com/trip-ideas/yoga-wellness/best-yoga-retreats",
  },
  {
    name: "Fashion Magazine",
    src: `${SUPA}/v2/2019/11/fashion.webp`,
    width: 963, height: 208,
    href: "https://fashionmagazine.com/wellness/health/exotic-resorts-bikini-body-prep/",
  },
  {
    name: "SmarterTravel",
    src: `${SUPA}/v2/2019/11/smartertravel.webp`,
    width: 600, height: 67,
    href: "https://www.smartertravel.com/wellness-travel-101-vacation-your-way-to-a-better-you/",
  },
];

function LogoImg({
  logo,
  heightClass,
}: {
  logo: Logo;
  heightClass: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={logo.name}
      width={logo.width}
      height={logo.height}
      loading="lazy"
      decoding="async"
      className={`max-w-full object-contain ${heightClass}`}
    />
  );
}

export default function PressBar() {
  return (
    <section className="bg-anamaya-teal-muted px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
          Recommended by:
        </h2>

        {/* Featured — National Geographic, centered, on its own row */}
        <div className="mb-6 flex justify-center">
          {NAT_GEO.href ? (
            <Link
              href={NAT_GEO.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Read the article in ${NAT_GEO.name}`}
              className="block transition-opacity hover:opacity-80"
            >
              <LogoImg logo={NAT_GEO} heightClass="h-10 sm:h-12" />
            </Link>
          ) : (
            <LogoImg logo={NAT_GEO} heightClass="h-10 sm:h-12" />
          )}
        </div>

        {/* 8 logos — one row on desktop, wrap to 4 cols on narrow screens */}
        <ul className="grid grid-cols-4 gap-x-6 gap-y-4 md:grid-cols-8">
          {LOGOS.map((logo) => (
            <li
              key={logo.name}
              className="flex h-8 items-center justify-center sm:h-9"
            >
              {logo.href ? (
                <Link
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Read the article in ${logo.name}`}
                  className="block h-full transition-opacity hover:opacity-80"
                >
                  <LogoImg logo={logo} heightClass="h-full" />
                </Link>
              ) : (
                <LogoImg logo={logo} heightClass="h-full" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
