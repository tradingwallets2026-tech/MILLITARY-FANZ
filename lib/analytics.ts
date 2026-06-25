/**
 * Military Pass — PostHog Analytics
 * ====================================
 * Provides useAnalytics() hook for tracking key events.
 *
 * Setup:
 *   npm install posthog-js
 *   Add to .env.local:
 *     NEXT_PUBLIC_POSTHOG_KEY=phc_xxxx
 *     NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
 */

type EventProperties = Record<string, string | number | boolean | null>;

// Lazy-load posthog to avoid SSR issues — type declared here to avoid hard dep
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ph: any | null = null;

async function getPostHog() {
  if (typeof window === "undefined") return null;
  if (_ph) return _ph;

  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  if (!key) return null;

  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host:              host,
      capture_pageview:      false, // Manually track with Next.js router
      capture_pageleave:     true,
      session_recording:     { maskAllInputs: true },
      autocapture:           false,  // Manual events only
    });
    _ph = posthog;
    return posthog;
  } catch {
    return null;
  }
}

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

export async function track(event: string, properties?: EventProperties) {
  const ph = await getPostHog();
  ph?.capture(event, properties);
}

export async function identify(userId: string, traits?: EventProperties) {
  const ph = await getPostHog();
  ph?.identify(userId, traits);
}

export async function pageview(path: string) {
  const ph = await getPostHog();
  ph?.capture("$pageview", { $current_url: path });
}

export async function reset() {
  const ph = await getPostHog();
  ph?.reset();
}

/** React hook for analytics — convenience wrapper */
export function useAnalytics() {
  return {
    track,
    identify,
    pageview,
    reset,
    Events,
  };
}
