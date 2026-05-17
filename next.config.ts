import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every migrated WP URL is canonical WITH a trailing slash (all 1001
  // url_inventory rows end in "/", and the frozen HTML's own
  // <link rel="canonical"> points at the slash form). Next's default
  // behaviour 308-redirects "/foo/" → "/foo", which would bounce every
  // indexed URL on launch. skipTrailingSlashRedirect disables BOTH
  // automatic redirects (no forced "/foo" → "/foo/" either) so there is
  // zero blast radius on /api, /auth/callback, or webhooks — the proxy
  // resolves either slash shape against url_inventory directly.
  skipTrailingSlashRedirect: true,
  experimental: {
    // Block-editor snapshot uploads pass the rendered image through a
    // server action. The default 1 MB cap was rejecting hero snapshots
    // with 400. 8 MB leaves plenty of headroom; the helper also
    // compresses to JPEG before posting so typical payloads stay small.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
