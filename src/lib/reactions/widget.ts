// Self-contained reaction widget injected at the bottom of every frozen
// snapshot article (and reused by the React component on native pages).
//
// SECURITY: this string is STATIC — no request data is interpolated, so it
// carries no XSS surface even though it's spliced into untrusted WP HTML.
// The article path is read from location.pathname at runtime (never
// server-injected), and the API canonicalizes it again server-side.
//
// Behaviour: hollow grey heart → click opens a 3-option modal (LIKE / LOVE /
// MARRY). Once chosen the label reads LIKED / LOVED / TRULY LOVED and the
// heart turns red in one of three sizes by level. One vote per device
// (localStorage). Fires a view ping on load (client-side, so it still counts
// even when this HTML is served from the CDN cache).

// Clean, symmetric heart (Material-style), viewBox 0 0 24 24.
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

export const REACTION_WIDGET = `
<div id="anamaya-react" data-state="0" role="group" aria-label="React to this post">
  <div class="ar-inner">
    <button type="button" class="ar-heart" aria-label="React to this post">
      <svg viewBox="0 0 24 24" width="28" height="28" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${HEART_PATH}"/></svg>
    </button>
    <span class="ar-label"></span>
  </div>
  <div class="ar-modal" hidden>
    <div class="ar-card" role="dialog" aria-modal="true" aria-label="Rate this post">
      <p class="ar-q">How do you feel about this post?</p>
      <button type="button" class="ar-opt" data-level="1">LIKE post</button>
      <button type="button" class="ar-opt" data-level="2">LOVE post</button>
      <button type="button" class="ar-opt ar-opt-3" data-level="3">I WANT TO MARRY AND HAVE CHILDREN WITH THIS POST</button>
      <button type="button" class="ar-clear" data-level="0">Clear my reaction</button>
    </div>
  </div>
</div>
<style>
#anamaya-react{max-width:680px;margin:40px auto 8px;padding:26px 20px 4px;border-top:1px solid #e2ded1;text-align:center;font-family:"Oswald","Arial Narrow",system-ui,sans-serif;}
#anamaya-react .ar-inner{display:inline-flex;align-items:center;gap:12px;}
#anamaya-react .ar-heart{background:none;border:0;cursor:pointer;padding:6px;line-height:0;display:inline-flex;}
/* Force square dimensions with !important + max-width:none so the host WP
   theme's img/svg rules can't stretch or shrink the heart. */
#anamaya-react .ar-heart svg{width:28px!important;height:28px!important;max-width:none!important;display:inline-block;vertical-align:middle;transition:width .18s ease,height .18s ease;}
#anamaya-react .ar-heart path{fill:none;stroke:#b3b0a6;stroke-width:2;transition:fill .18s,stroke .18s;}
#anamaya-react[data-state="0"] .ar-heart svg{width:28px!important;height:28px!important;}
#anamaya-react[data-state="1"] .ar-heart svg{width:24px!important;height:24px!important;}
#anamaya-react[data-state="2"] .ar-heart svg{width:32px!important;height:32px!important;}
#anamaya-react[data-state="3"] .ar-heart svg{width:42px!important;height:42px!important;}
#anamaya-react[data-state="1"] .ar-heart path,
#anamaya-react[data-state="2"] .ar-heart path,
#anamaya-react[data-state="3"] .ar-heart path{fill:#ae564b;stroke:#ae564b;}
#anamaya-react .ar-label{text-transform:uppercase;letter-spacing:.16em;font-size:13px;font-weight:600;color:#8b917f;}
#anamaya-react[data-state="1"] .ar-label,
#anamaya-react[data-state="2"] .ar-label,
#anamaya-react[data-state="3"] .ar-label{color:#ae564b;}
#anamaya-react .ar-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(18,26,14,.55);backdrop-filter:blur(2px);padding:20px;}
#anamaya-react .ar-modal[hidden]{display:none;}
#anamaya-react .ar-card{background:#fff;border-radius:12px;max-width:420px;width:100%;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);}
#anamaya-react .ar-q{font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#636a26;margin:0 0 16px;}
#anamaya-react .ar-opt{display:block;width:100%;margin:0 0 10px;padding:13px 14px;border:0;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;background:#97c03b;color:#14200a;transition:background .15s;}
#anamaya-react .ar-opt:hover{background:#7ca32b;}
#anamaya-react .ar-opt-3{background:#ae564b;color:#fff;font-size:12.5px;line-height:1.3;}
#anamaya-react .ar-opt-3:hover{background:#8f463d;}
#anamaya-react .ar-clear{display:block;width:100%;margin-top:6px;padding:9px;border:0;background:none;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8b917f;}
#anamaya-react .ar-clear:hover{color:#444;}
</style>
<script>
(function(){
  var root=document.getElementById('anamaya-react');
  if(!root||root.dataset.init)return;root.dataset.init='1';
  // Move the widget to the END OF THE ARTICLE TEXT (not below the footer,
  // which is where it's injected). Try the WP/Elementor content containers
  // in order; fall back to leaving it where it is.
  try{
    var anchors=['.elementor-widget-theme-post-content .elementor-widget-container','.entry-content','article','main'];
    for(var ai=0;ai<anchors.length;ai++){var host=document.querySelector(anchors[ai]);if(host){host.appendChild(root);break;}}
  }catch(e){}
  var path=location.pathname;
  var STORE='anamaya_reactions',VIDK='anamaya_vid';
  function vid(){var v=null;try{v=localStorage.getItem(VIDK);}catch(e){}
    if(!v){v='v'+Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem(VIDK,v);}catch(e){}}return v;}
  function store(){try{return JSON.parse(localStorage.getItem(STORE)||'{}');}catch(e){return {};}}
  function myLevel(){return store()[path]||0;}
  function setLevel(l){var s=store();if(l){s[path]=l;}else{delete s[path];}try{localStorage.setItem(STORE,JSON.stringify(s));}catch(e){}}
  var LABELS={0:'Rate this post',1:'Liked',2:'Loved',3:'Truly Loved'};
  function render(){var l=myLevel();root.setAttribute('data-state',String(l));root.querySelector('.ar-label').textContent=LABELS[l];}
  var modal=root.querySelector('.ar-modal');
  root.querySelector('.ar-heart').addEventListener('click',function(){modal.hidden=false;});
  modal.addEventListener('click',function(e){
    if(e.target===modal){modal.hidden=true;return;}
    var b=e.target.closest('button[data-level]');if(!b)return;
    var level=parseInt(b.getAttribute('data-level'),10)||0;
    setLevel(level);render();modal.hidden=true;
    try{fetch('/api/reactions',{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify({path:path,visitorId:vid(),level:level})});}catch(e){}
  });
  render();
  try{fetch('/api/views',{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify({path:path})});}catch(e){}
})();
</script>
`;

/** Splice the widget in just before the closing </body> (or append). */
export function injectReactionWidget(html: string): string {
  const i = html.toLowerCase().lastIndexOf("</body>");
  if (i === -1) return html + REACTION_WIDGET;
  return html.slice(0, i) + REACTION_WIDGET + html.slice(i);
}
