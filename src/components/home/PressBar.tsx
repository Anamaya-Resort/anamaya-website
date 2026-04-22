// "RECOMMENDED BY:" press logos bar. Runs full-width with the muted-teal v2 bg
// (rgba(122,165,158,0.8) ≈ anamaya-teal-muted). Sits between the fixed site
// header and the video hero — first element in the page flow.
//
// The logos live on Supabase Storage as optimized webps; we defer-load them
// with loading="lazy" and explicit width/height so they don't block paint.

import Link from "next/link";

type Logo = {
  name: string;
  /** absolute URL to the logo image (webp, already optimized) */
  src: string;
  width: number;
  height: number;
  /** outbound link; null = not a link (first slot or missing) */
  href: string | null;
};

const SUPA =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images";

const NAT_GEO_URL =
  "https://www.nationalgeographic.com/travel/best-of-the-world-2026/article/best-wellness-destinations";

const LOGOS: Logo[] = [
  {
    name: "Condé Nast Traveler",
    src: `${SUPA}/v2/2019/11/logo.webp`,
    width: 1056, height: 326,
    href: null, // v2 has no link on the first logo
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
    href: NAT_GEO_URL,
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

export default function PressBar() {
  return (
    <section className="bg-anamaya-teal-muted px-6 py-8 pt-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/90">
          Recommended by:
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {LOGOS.map((logo) => (
            <li key={logo.name}>
              {logo.href ? (
                <Link
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Read the article in ${logo.name}`}
                  className="block transition-opacity hover:opacity-80"
                >
                  <LogoImg logo={logo} />
                </Link>
              ) : (
                <LogoImg logo={logo} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LogoImg({ logo }: { logo: Logo }) {
  // Cap display height so all logos sit on the same baseline regardless of
  // their native aspect. The explicit width/height attrs still reserve the
  // correct space to avoid layout shift.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={logo.name}
      width={logo.width}
      height={logo.height}
      loading="lazy"
      decoding="async"
      className="h-10 w-auto object-contain sm:h-12"
    />
  );
}
