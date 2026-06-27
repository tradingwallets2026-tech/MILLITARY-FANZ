# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Military Pass Next.js App Router project. PostHog is now initialized via `instrumentation-client.ts` (the correct pattern for Next.js 15.3+), with a reverse proxy configured in `next.config.js` for improved ad-blocker resilience. A server-side client (`lib/posthog-server.ts`) was created using `posthog-node` for tracking critical business events that occur server-side (payments, avatar processing, referrals). The existing `lib/analytics.ts` abstraction was updated to use the proper direct import pattern rather than lazy-loading. User identification (`posthog.identify()`) is called on both login and signup with email as the distinct ID. Error tracking (`posthog.captureException()`) was added to the voice training failure path.

| Event Name | Description | File |
|---|---|---|
| `user_signed_up` | User successfully creates a new account | `app/auth/signup/page.tsx` |
| `user_logged_in` | User successfully authenticates with email and password | `app/auth/login/page.tsx` |
| `login_failed` | Login attempt returned an error | `app/auth/login/page.tsx` |
| `studio_session_started` | User starts a live face/voice transformation session | `app/studio/StudioClient.tsx` |
| `studio_session_ended` | User stops a studio session (includes duration & credits used) | `app/studio/StudioClient.tsx` |
| `avatar_selected` | User selects an avatar for face transformation | `app/studio/StudioClient.tsx` |
| `credits_exhausted` | User runs out of credits during an active session | `app/studio/StudioClient.tsx` |
| `plan_selected` | User clicks to purchase a credit plan | `components/PaystackButton.tsx`, `components/StripeButton.tsx` |
| `voice_training_started` | User submits audio samples to train a custom voice model | `app/dashboard/voice-training/VoiceTrainingClient.tsx` |
| `voice_model_deleted` | User deletes a trained custom voice model | `app/dashboard/voice-training/VoiceTrainingClient.tsx` |
| `credit_purchase_initiated` | Server creates a Stripe checkout session | `app/api/stripe/checkout/route.ts` |
| `credit_purchase_completed` | Stripe webhook confirms successful payment | `app/api/webhooks/stripe/route.ts` |
| `credit_purchase_completed` | Paystack webhook confirms successful payment | `app/api/webhooks/paystack/route.ts` |
| `avatar_uploaded` | User successfully uploads and processes a new avatar | `app/api/avatars/upload/route.ts` |
| `referral_claimed` | New user successfully claims a referral code | `app/api/referral/route.ts` |

## Next steps

We've built a dashboard with five insights to monitor key user behaviors:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/487896/dashboard/1767221)
- **Insight 1**: [New Signups & Logins](https://us.posthog.com/project/487896/insights/guHzq1Sg) — Daily unique users signing up and logging in
- **Insight 2**: [Studio Sessions Started](https://us.posthog.com/project/487896/insights/UFV4zxS2) — Daily unique users starting/ending live transformation sessions
- **Insight 3**: [Monetization Conversion Funnel](https://us.posthog.com/project/487896/insights/7YhEgsAx) — Signup → Plan Selected → Purchase Completed conversion rates
- **Insight 4**: [Credit Purchases vs Exhaustions](https://us.posthog.com/project/487896/insights/Pk0P0NWA) — Purchases completed vs credits exhausted (churn signal)
- **Insight 5**: [Feature Engagement](https://us.posthog.com/project/487896/insights/m66XrBS8) — Avatar uploads, voice training starts, and referrals claimed

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any onboarding scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the current login handler only identifies on a successful form submit; SSO or session-restore flows should also call `posthog.identify()` when a session is resumed.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
