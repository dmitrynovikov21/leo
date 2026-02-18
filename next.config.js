const { withContentlayer } = require("next-contentlayer2");
const withNextIntl = require('next-intl/plugin')();

import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ignore ESLint and TypeScript errors during builds (we have too many legacy issues)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },
  experimental: {
    // serverComponentsExternalPackages is moved to top-level in newer Next.js but still supported in experimental for some versions
    serverComponentsExternalPackages: ["@prisma/client", "ssh2", "cpu-features", "dockerode"],
  },
  output: "standalone",
};

module.exports = withContentlayer(withNextIntl(nextConfig));
