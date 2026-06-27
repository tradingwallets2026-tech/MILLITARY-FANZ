/**
 * @fileoverview Next.js webpack and server configuration.
 * Integrates security headers, standalone output builds, and wraps the
 * entire configuration with Sentry Next.js SDK for server/client error logging.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Performance & Standalone Build ───────────────────────
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  // ── Image optimization remote schemas ─────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ── HTTP Security headers ─────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
        ],
      },
    ];
  },

  // ── Experimental next features ───────────────────────────
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

// Wrap Next.js config with Sentry error monitoring integration
module.exports = withSentryConfig(
  nextConfig,
  {
    // Webpack plugin options: suppress logs and specify org/project context
    silent: true,
    org: "military-fanz",
    project: "javascript-nextjs",
  },
  {
    // SDK options: enable client source maps and tunnel routes
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
);
