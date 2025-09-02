// Ensure required env variables are present before starting Next.js
const checkEnvVariables = require("./check-env-variables")
checkEnvVariables()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Helpful during development to see full URLs of fetch() calls
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // We allow building even if ESLint/TS find issues (you can tighten later)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Allow external image hosts used across the app
    remotePatterns: [
      // Local dev backends/CDNs
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "127.0.0.1" },

      // Placeholder generator used in cart thumbnails
      { protocol: "https", hostname: "via.placeholder.com" },

      // Medusa demo/public assets
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      { protocol: "https", hostname: "medusa-server-testing.s3.amazonaws.com" },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
    ],
    // Modern formats if the source supports them
    formats: ["image/avif", "image/webp"],
  },
}

module.exports = nextConfig
