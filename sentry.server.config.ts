/**
 * @fileoverview Sentry server-side configuration for Next.js.
 * Initializes Sentry in the Node.js environment to monitor API routes,
 * server component renders, and database interactions.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // The DSN endpoint where exception events are forwarded
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring transaction sample rate (10% in production)
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Disable verbose debug logging in production
  debug: false,
});
