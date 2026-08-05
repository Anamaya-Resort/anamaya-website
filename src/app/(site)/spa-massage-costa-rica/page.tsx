import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import SpaOverVideo from "./SpaChrome";
import { getSpaMenu, type SpaCategory, type SpaTier } from "./data";

// Prices are read live from AnamayOS on every request.
export const dynamic = "force-dynamic";

const BOOK_URL = "https://wa.me/18777018707";
const HERO_IMG =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2018/12/Spa-1-1200px.webp";
const BAND_IMG =
  "https://vytqdnwnqiqiwjhqctyi.supabase.co/storage/v1/object/public/images/v2/2019/11/SPA-10.webp";
const FLOWER = "/journal/flower-sideways-right.webp";

const INTRO =
  "Anamaya is a place for personal & spiritual growth, to destress, and to rejuvenate your mind, body and spirit. We have an amazing variety of ways you can treat yourself to a super relaxing and beautifully healing service, including massage, skin services, holistic therapies and beauty treatments.";
const DISCOUNT =
  "15% OFF All Spa Treatments for locals living in the area or YTT students during Yoga Teacher Trainings.";

export function generateMetadata(): Metadata {
  const description =
    "Massage, holistic therapies, skin and beauty treatments at the Anamaya Spa in Montezuma, Costa Rica. Live treatment menu and prices.";
  return {
    title: "Anamaya Spa, Costa Rica",
    description,
    openGraph: {
      title: "Anamaya Spa, Costa Rica",
      description,
      type: "website",
      images: [HERO_IMG],
    },
  };
}

function Tiers({ tiers }: { tiers: SpaTier[] }) {
  return (
    <div className="spa-price">
      {tiers.map((t, i) => (
        <span className="spa-ptier" key={`${t.label}-${t.price}-${i}`}>
          {t.label && <span className="spa-pdur">{t.label}</span>}
          <span className="spa-pamt">{t.price}</span>
        </span>
      ))}
    </div>
  );
}

/** Category title bookended by the sideways flower (left flipped). */
function CategoryTitle({ name }: { name: string }) {
  return (
    <div className="spa-ctitle">
      <span className="spa-fl spa-fl-l" aria-hidden />
      <h2>{name}</h2>
      <span className="spa-fl spa-fl-r" aria-hidden />
    </div>
  );
}

function CategoryBlock({ cat, index }: { cat: SpaCategory; index: number }) {
  // Alternate the ornate divider colour, red on even, green on odd.
  const divider = index % 2 === 0 ? "/spa/divider-red.webp" : "/spa/divider-green.webp";
  return (
    <>
      <div className="spa-orn">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={divider} alt="" />
      </div>
      <section className="spa-cat">
        <CategoryTitle name={cat.name} />
        <div className="spa-rows">
          {cat.treatments.map((t) => (
            <div className="spa-row" key={t.key}>
              <div className="spa-main">
                <h3>{t.name}</h3>
                {t.description && <p>{t.description}</p>}
              </div>
              <Tiers tiers={t.tiers} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default async function SpaPage() {
  const menu = await getSpaMenu();

  return (
    <>
      {/* Real site chrome — same wordmark logos the category/blog routes
          use. Dark/transparent over the hero (SpaOverVideo sets
          HeaderContext.overVideo), reverting to white on scroll. */}
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />
      <SpaOverVideo />

      <style>{cssScoped}</style>

      <div id="spa-page">
        {/* ---------- HERO ---------- */}
        <section className="spa-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMG} alt="The Anamaya Spa, Costa Rica" />
          <span className="scrim" aria-hidden />
          <div className="in">
            <div className="spa-kicker">Anamaya · Costa Rica</div>
            <h1>The Spa</h1>
            <p>{INTRO}</p>
            <a className="spa-pill" href={BOOK_URL} target="_blank" rel="noopener noreferrer">
              Book on WhatsApp
            </a>
            <span className="spa-disc">{DISCOUNT}</span>
          </div>
        </section>

        {/* ---------- CENTERED MENU (live from AnamayOS) ---------- */}
        <div className="spa-wrap">
          {menu.length === 0 ? (
            <div className="spa-empty">
              <p>
                Our treatment menu is being updated. Please message us on
                WhatsApp for current services and pricing.
              </p>
            </div>
          ) : (
            menu.map((cat, i) => (
              <div key={cat.id}>
                <CategoryBlock cat={cat} index={i} />
                {/* One full-bleed photo band after the 2nd category. */}
                {i === 1 && (
                  <div className="spa-band">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={BAND_IMG} alt="Spa treatment at Anamaya" />
                    <span className="bscrim" aria-hidden />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ---------- CTA ---------- */}
        <section className="spa-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BAND_IMG} alt="" />
          <span className="scrim" aria-hidden />
          <div className="in">
            <h2>Reserve your treatment</h2>
            <p>Message us on WhatsApp to book. {DISCOUNT}</p>
            <a className="spa-pill" href={BOOK_URL} target="_blank" rel="noopener noreferrer">
              Book on WhatsApp
            </a>
          </div>
        </section>
      </div>

      {/* Right-anchored slide-out MENU (opened by the top bar). Empty
          content falls back to the site's SIDE_MENU nav. */}
      <UiSideMenuRightBlock content={{}} />
    </>
  );
}

// Bespoke Concept B ("Centered Ceremony") styling, scoped under #spa-page.
// Uses the site theme tokens (var(--color-anamaya-*), var(--font-heading));
// only the photo scrims/gradients — which have no token — are literal.
const cssScoped = `
#spa-page {
  --spa-green: var(--color-anamaya-green);
  --spa-green-dark: var(--color-anamaya-green-dark);
  --spa-olive-dark: var(--color-anamaya-olive-dark);
  --spa-ink: var(--color-anamaya-charcoal);
  --spa-soft: color-mix(in srgb, var(--color-anamaya-charcoal) 72%, #ffffff);
  --spa-faint: var(--color-anamaya-teal-muted);
  --spa-line: color-mix(in srgb, var(--color-anamaya-mint) 65%, transparent);
  background: var(--color-anamaya-cream);
  color: var(--spa-ink);
  font-size: 17px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
#spa-page img { display: block; max-width: 100%; }
#spa-page a { text-decoration: none; }

/* HERO */
.spa-hero { position: relative; min-height: 92vh; display: flex; align-items: flex-end; color: #fff; background: #2a3326; }
.spa-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.spa-hero .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,36,22,.34) 25%, rgba(20,28,14,.82)); }
.spa-hero .in { position: relative; max-width: 1280px; margin: 0 auto; padding: 0 32px 78px; width: 100%; }
.spa-kicker { font-family: var(--font-heading); font-weight: 500; font-size: 13px; letter-spacing: .36em; text-transform: uppercase; opacity: .9; margin-bottom: 16px; }
.spa-hero h1 { font-family: var(--font-heading); font-weight: 600; text-transform: uppercase; font-size: clamp(62px, 12vw, 150px); line-height: .88; margin: 0; text-shadow: 0 2px 30px rgba(0,0,0,.3); }
.spa-hero p { max-width: 560px; font-size: 18px; line-height: 1.7; margin: 20px 0 26px; opacity: .95; }
.spa-pill { display: inline-block; font-family: var(--font-heading); font-weight: 500; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; background: var(--spa-green); color: #fff; border-radius: 999px; padding: 13px 30px; transition: background .2s; }
.spa-pill:hover { background: var(--spa-green-dark); }
.spa-disc { display: block; margin-top: 16px; font-family: var(--font-heading); font-weight: 500; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.85); }

/* CENTERED MENU */
.spa-wrap { max-width: 820px; margin: 0 auto; padding: 34px 26px 8px; position: relative; }
.spa-cat { padding: 26px 0 8px; }
.spa-rows { display: flex; flex-direction: column; }
.spa-row { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: baseline; padding: 17px 0; border-bottom: 1px solid var(--spa-line); }
.spa-row h3 { font-family: var(--font-heading); font-weight: 600; font-size: 20px; color: var(--spa-ink); margin: 0 0 6px; letter-spacing: .01em; }
.spa-row p { font-size: 14px; line-height: 1.6; color: var(--spa-soft); margin: 0; max-width: 58ch; }
.spa-empty { text-align: center; padding: 60px 0; color: var(--spa-soft); font-style: italic; }

/* Price tiers */
.spa-price { display: flex; flex-direction: column; gap: 2px; text-align: right; min-width: 104px; }
.spa-ptier { display: flex; justify-content: flex-end; gap: 10px; font-variant-numeric: tabular-nums; }
.spa-pdur { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--spa-faint); align-self: center; }
.spa-pamt { font-family: var(--font-heading); font-weight: 600; font-size: 15px; color: var(--spa-olive-dark); }

/* Ornate divider + flower-bookended category title */
.spa-orn { display: flex; justify-content: center; padding: 6px 0; }
.spa-orn img { width: min(560px, 74%); height: auto; opacity: .92; }
.spa-ctitle { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 6px 0 20px; }
.spa-ctitle h2 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(24px, 3.2vw, 36px); letter-spacing: .08em; text-transform: uppercase; color: var(--spa-olive-dark); margin: 0; text-align: center; }
.spa-fl { flex: none; width: 36px; height: 32px; opacity: .5; background: url(${FLOWER}) center/contain no-repeat; }
.spa-fl-l { transform: scaleX(-1); }

/* Full-bleed photo band */
.spa-band { position: relative; height: 320px; margin: 40px 0 8px; overflow: hidden; border-radius: 2px; }
.spa-band img { width: 100%; height: 100%; object-fit: cover; }
.spa-band .bscrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,36,22,.15), rgba(28,36,22,.4)); }

/* CTA */
.spa-cta { position: relative; min-height: 54vh; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; padding: 70px 24px; background: #2a3326; overflow: hidden; }
.spa-cta > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.spa-cta .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(28,36,22,.52), rgba(20,28,14,.72)); }
.spa-cta .in { position: relative; max-width: 560px; }
.spa-cta h2 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(30px, 4.5vw, 48px); text-transform: uppercase; margin: 0 0 14px; }
.spa-cta p { opacity: .95; margin: 0 0 24px; }

@media (max-width: 560px) {
  .spa-row { grid-template-columns: 1fr; gap: 8px; }
  .spa-row .spa-price { text-align: left; align-items: flex-start; min-width: 0; }
  .spa-row .spa-ptier { justify-content: flex-start; }
}
`;
