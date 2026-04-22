import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
