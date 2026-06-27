/**
 * @fileoverview Sentry client-side configuration for Next.js.
 * Initializes Sentry in the browser environment to track frontend exceptions,
 * page loads, performance metrics, and session replays.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // The DSN endpoint where exception events are forwarded
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of performance transactions during development, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Captures 100% of sessions that result in an error
  replaysOnErrorSampleRate: 1.0,

  // Captures 10% of all sessions for general UX analysis and debugging
  replaysSessionSampleRate: 0.1,

  // Integrated telemetry modules for browser diagnostics
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Print diagnostic messages in development mode
  debug: false,
});
