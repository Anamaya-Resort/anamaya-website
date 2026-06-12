// Per-request transforms applied to frozen WP HTML before serving.
// Kept as regex passes to match the style of scripts/snapshot/phase-c-rewrite.ts
// — no full HTML parser dependency.

// Swarmify config + runtime. Was injected globally by the WP Swarmify
// plugin; replicates the same two <script> tags so video acceleration
// keeps working without WordPress.
const SWARMIFY_SNIPPET =
  `<script>var swarmoptions={swarmcdnkey:"e696ca09-25bc-4316-a135-0c98f8ab1ed3",` +
  `autoreplace:{youtube:false,youtubecaptions:false,videotag:true},` +
  `theme:{primaryColor:"#ffde17"},iframeReplacement:"iframe"};</script>` +
  `<script src="https://assets.swarmcdn.com/cross/swarmdetect.js"></script>`;

// Hide WP comment UI via CSS rather than deleting nodes. WP comment
// markup is deeply nested (#comments > .ast-comment-list > li > article
// > div > div …); a regex strip can't balance the closing </div> and
// would either leave the comment list behind or emit an unbalanced tag
// that corrupts page layout. display:none on the well-known ids/classes
// is bulletproof and DOM-safe. Trade-off: the (old, low-value) comment
// text stays in the HTML source — acceptable vs. breaking the page.
const COMMENT_HIDE_STYLE =
  `<style id="anamaya-snapshot-overrides">` +
  `#comments,#respond,#commentform,.comments-area,.comment-respond,` +
  `.comments-title,.comment-list,.ast-comment-list{display:none!important}` +
  `</style>`;

// Conversion tracking for snapshot pages. GA4 (gtag) + Meta Pixel (fbq)
// are already loaded by the page's baked-in tags, so this just emits the
// same conversion EVENTS the native ConversionTracking component fires —
// booking-CTA clicks, pricing-page views, and (best-effort) form leads —
// keeping snapshot + native pages on one consistent event stream.
const CONVERSION_SNIPPET =
  `<script id="anamaya-conversions">(function(){` +
  `function ga(e,p){if(window.gtag)window.gtag('event',e,p||{})}` +
  `function fb(e,p){if(window.fbq)window.fbq('track',e,p||{})}` +
  `try{if(/(^|\\/)(rates?|pricing|prices?)(\\/|$)/i.test(location.pathname)){` +
  `ga('view_pricing',{label:document.title});fb('ViewContent',{content_type:'pricing'})}}catch(e){}` +
  `document.addEventListener('click',function(e){` +
  `var a=e.target&&e.target.closest&&e.target.closest('a');if(!a)return;` +
  `var h=a.getAttribute('href')||'';if(/\\/rg-calendar|retreat\\.guru/i.test(h)){` +
  `ga('booking_click',{label:(a.textContent||'').trim().slice(0,80)||h});` +
  `fb('InitiateCheckout',{content_category:'retreat_booking'})}},true);` +
  `var L=false;window.addEventListener('message',function(e){if(L)return;` +
  `if(!/sereenly\\.com|msgsndr\\.com/i.test(e.origin||''))return;` +
  `var d=typeof e.data==='string'?e.data:JSON.stringify(e.data||'');` +
  `if(/\\b(form[_-]?submit|submitted|onFormSubmit|lead)\\b/i.test(d)){L=true;ga('generate_lead',{});fb('Lead',{})}},false);` +
  `})();</script>`;

export function applySnapshotTransforms(html: string): string {
  if (!/<\/head>/i.test(html)) return html;
  // Single <head> rewrite: prepend whatever isn't already present.
  let inject = COMMENT_HIDE_STYLE;
  if (!html.includes("swarmcdn.com/cross/swarmdetect.js")) {
    inject += SWARMIFY_SNIPPET;
  }
  if (!html.includes('id="anamaya-conversions"')) {
    inject += CONVERSION_SNIPPET;
  }
  return html.replace(/<\/head>/i, `${inject}</head>`);
}
