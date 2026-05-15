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

export function applySnapshotTransforms(html: string): string {
  let out = html;
  out = injectSwarmify(out);
  out = stripCommentForms(out);
  return out;
}

function injectSwarmify(html: string): string {
  if (html.includes("swarmcdn.com/cross/swarmdetect.js")) return html;
  if (!/<\/head>/i.test(html)) return html;
  return html.replace(/<\/head>/i, `${SWARMIFY_SNIPPET}</head>`);
}

// WP themes wrap blog comments in a #comments container with a #respond
// (comment form) inside. Strip the whole block. Also strip orphan
// #commentform forms in case a theme rendered them outside #comments.
function stripCommentForms(html: string): string {
  return html
    .replace(
      /<(div|section|aside)\b[^>]*\bid=["']comments["'][^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(div|section)\b[^>]*\bid=["']respond["'][^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<form\b[^>]*\bid=["']commentform["'][^>]*>[\s\S]*?<\/form>/gi,
      "",
    );
}
