/**
 * @fileoverview Sentry edge-runtime configuration for Next.js.
 * Initializes Sentry in Vercel Edge Functions and Next.js middleware
 * to capture lightweight runtime exceptions and track performance.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // The DSN endpoint where exception events are forwarded
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring transaction sample rate
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Disable verbose debug logging in production
  debug: false,
});
