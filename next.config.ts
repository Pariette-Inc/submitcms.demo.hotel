import type { NextConfig } from "next";

const mediaHost = process.env.SUBMITCMS_MEDIA_HOST;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "live.submitcms.com", pathname: "/**" },
      { protocol: "https", hostname: "dev.submitcms.com", pathname: "/**" },
      ...(mediaHost
        ? [{ protocol: "https" as const, hostname: mediaHost, pathname: "/**" }]
        : []),
    ],
  },
};

export default nextConfig;
