import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thumbnail.komiku.to",
      },
      {
        protocol: "https",
        hostname: "thumbnail.komiku.org",
      },
      {
        protocol: "https",
        hostname: "komiku.org",
      },
      {
        protocol: "https",
        hostname: "komiku.to",
      },
    ],
  },
};

export default nextConfig;
