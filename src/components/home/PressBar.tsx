// "RECOMMENDED BY:" press logos bar.
// Sits below the video hero. Muted-teal bg matching v2.
//
// Single row of 9 logos with widths 10% 10% 10% 10% 20% 10% 10% 10% 10%.
// National Geographic is the 5th (center) slot at 2× the width and 2× the
// height of the others so it's the headline endorsement.

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

const LOGOS: Logo[] = [
  {
    name: "Condé Nast Traveler",
    src: `${SUPA}/v2/2019/11/logo.webp`,
    width: 1056, height: 326,
    href: null,
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
    name: "National Geographic",
    src: `${SUPA}/v2/2026/03/national-geographic-black-512px.webp`,
    width: 512, height: 151,
    href: "https://www.nationalgeographic.com/travel/best-of-the-world-2026/article/best-wellness-destinations",
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

// Column widths sum to 100%. Middle slot (index 4, National Geographic) is 2× wide.
const COL_WIDTHS = ["10%", "10%", "10%", "10%", "20%", "10%", "10%", "10%", "10%"];

// Other logos sit at this height; NatGeo is 2× → h-16 (64 px).
const LOGO_HEIGHT = "h-8 sm:h-10";
const FEATURE_HEIGHT = "h-16 sm:h-20";

function LogoImg({ logo, heightClass }: { logo: Logo; heightClass: string }) {
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
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
          Recommended by:
        </h2>

        <ul
          className="grid items-center"
          style={{ gridTemplateColumns: COL_WIDTHS.join(" ") }}
        >
          {LOGOS.map((logo, i) => {
            const isFeature = i === 4;
            return (
              <li
                key={logo.name}
                className="flex items-center justify-center px-2 sm:px-3"
              >
                {logo.href ? (
                  <Link
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Read the article in ${logo.name}`}
                    className="block transition-opacity hover:opacity-80"
                  >
                    <LogoImg
                      logo={logo}
                      heightClass={isFeature ? FEATURE_HEIGHT : LOGO_HEIGHT}
                    />
                  </Link>
                ) : (
                  <LogoImg
                    logo={logo}
                    heightClass={isFeature ? FEATURE_HEIGHT : LOGO_HEIGHT}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
