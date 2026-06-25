-- ═══════════════════════════════════════════════════════════════
-- Military Pass — Referral System Tables
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Referral codes table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL UNIQUE,
  total_referrals       INTEGER DEFAULT 0,
  total_credits_earned  INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_referral UNIQUE (user_id)
);

-- ─── Referral claims (one per invitee) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  credits_given INTEGER DEFAULT 75,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_invitee UNIQUE (invitee_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_claims  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access referrals"
  ON public.referrals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access claims"
  ON public.referral_claims FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_referrals_code       ON public.referrals (code);
CREATE INDEX IF NOT EXISTS idx_referrals_user       ON public.referrals (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_claims_inv  ON public.referral_claims (inviter_id);
