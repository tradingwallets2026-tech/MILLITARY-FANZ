import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

// Initialize PostHog client analytics telemetry
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});

// Export router transition hook for Sentry automatic client-side page transaction tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
