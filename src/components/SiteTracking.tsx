import Script from "next/script";
import { getTrackingSettings } from "@/lib/website-builder/settings";
import CustomTrackingCode from "@/components/CustomTrackingCode";
import ConversionTracking from "@/components/ConversionTracking";

// Global analytics for the NATIVE (React-rendered) pages — homepage,
// /retreats, /retreat/[slug], and any CMS catch-all page. The frozen WP
// snapshots already carry these exact tags baked into their HTML, so this
// component deliberately mirrors them: one GA4 property + the two Meta
// Pixels + Crazy Egg. That keeps analytics unified across snapshot and
// native pages (same IDs → one stream), with no double-counting because
// any given URL is served exactly one way.
//
// Values come from Admin → Technical → Tracking (site_settings). When a
// field is blank we fall back to the IDs currently live on anamaya.com so
// the site ships fully tracked on day one; editing the admin overrides
// them (see CURRENT_* below and the upgrade note in the launch report).

// IDs presently live on anamaya.com (extracted from the captured snapshots).
const CURRENT_GA4 = "G-TBTSR4FJCW";
const CURRENT_PIXELS = ["331563397336091", "518225776084188"];
const CURRENT_CRAZYEGG = "0130/9820"; // script.crazyegg.com/pages/scripts/0130/9820.js

function parsePixels(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{10,17}$/.test(s));
}

export default async function SiteTracking() {
  const t = await getTrackingSettings();

  const ga4 = t.ga4_id.trim() || CURRENT_GA4;
  const gtm = t.gtm_id.trim();
  const pixels = t.facebook_pixel_id.trim()
    ? parsePixels(t.facebook_pixel_id)
    : CURRENT_PIXELS;
  const crazyEgg = CURRENT_CRAZYEGG;

  return (
    <>
      {/* Google Tag Manager (only if explicitly configured — none today) */}
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}

      {/* Google Analytics 4 */}
      {ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4}');`}
          </Script>
        </>
      )}

      {/* Meta (Facebook) Pixels — both production pixels, single init */}
      {pixels.length > 0 && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${pixels.map((p) => `fbq('init', '${p}');`).join("\n")}
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {pixels.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://www.facebook.com/tr?id=${p}&ev=PageView&noscript=1`}
              />
            ))}
          </noscript>
        </>
      )}

      {/* Crazy Egg — heatmaps / scroll maps (low priority) */}
      {crazyEgg && (
        <Script
          src={`https://script.crazyegg.com/pages/scripts/${crazyEgg}.js`}
          strategy="lazyOnload"
        />
      )}

      {/* Admin free-form custom code (Admin → Technical → Tracking).
          Empty by default — GA4/Pixels above are the structured path. */}
      {(t.custom_head_html.trim() || t.custom_body_html.trim()) && (
        <CustomTrackingCode head={t.custom_head_html} body={t.custom_body_html} />
      )}

      {/* Conversion events: booking clicks, pricing views, form leads. */}
      <ConversionTracking />
    </>
  );
}
