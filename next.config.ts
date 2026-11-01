import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Hide the Next.js "N" / route-info badge in development.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
