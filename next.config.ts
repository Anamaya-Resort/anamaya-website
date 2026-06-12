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

  // Baseline security headers applied to every response (native pages,
  // snapshot route, and assets). Deliberately conservative: NO strict
  // Content-Security-Policy, because the site embeds many third-party
  // origins (Sereenly/GHL forms, YouTube, Stripe, Google Maps, GA4, Meta
  // Pixel, Crazy Egg, Swarmify) and a wrong CSP would silently break them.
  // A per-rule CSP can be layered on later from Admin → Technical →
  // Security once the embed allow-list is pinned down.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for 2 years incl. subdomains (site is HTTPS-only).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Stop MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't let other sites frame our pages (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Send only the origin on cross-site navigations.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down powerful APIs we don't use.
          {
            key: "Permissions-Policy",
            value: "browsing-topics=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
