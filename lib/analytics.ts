/**
 * Military Pass — PostHog Analytics
 * ====================================
 * Thin wrappers around posthog-js for consistent event tracking.
 * PostHog is initialized via instrumentation-client.ts (Next.js 15.3+).
 */

import posthog from "posthog-js";

type EventProperties = Record<string, string | number | boolean | null>;

// Named events for consistency across the app
export const Events = {
  // Auth
  SIGNUP:               "user_signed_up",
  LOGIN:                "user_logged_in",
  LOGOUT:               "user_logged_out",

  // Studio
  STUDIO_SESSION_START: "studio_session_started",
  STUDIO_SESSION_END:   "studio_session_ended",
  AVATAR_SELECTED:      "avatar_selected",
  VOICE_PRESET_CHANGED: "voice_preset_changed",
  RESOLUTION_CHANGED:   "resolution_changed",

  // Credits
  PURCHASE_INITIATED:   "credit_purchase_initiated",
  PURCHASE_COMPLETED:   "credit_purchase_completed",
  CREDITS_EXHAUSTED:    "credits_exhausted",
  LOW_CREDITS_WARNING:  "low_credits_warning",

  // Errors
  FACE_SWAP_ERROR:      "face_swap_error",
  VOICE_ERROR:          "voice_error",
  CAMERA_DENIED:        "camera_permission_denied",
} as const;

export function track(event: string, properties?: EventProperties) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identify(userId: string, traits?: EventProperties) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, traits);
}

export function reset() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

/** React hook for analytics — convenience wrapper */
export function useAnalytics() {
  return {
    track,
    identify,
    reset,
    Events,
  };
}
