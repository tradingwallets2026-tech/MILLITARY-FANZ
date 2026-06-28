-- ===========================================
-- MILITARY PASS — DATABASE SCHEMA
-- Supabase / PostgreSQL
-- ===========================================

-- ──────────────────────────────────────────
-- 1. EXTENSIONS
-- ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────
-- 2. PROFILES (extends Supabase auth.users)
-- ──────────────────────────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  website         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ──────────────────────────────────────────
-- 3. CREDITS
-- ──────────────────────────────────────────
CREATE TABLE public.credits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance         INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used      INTEGER NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT non_negative_balance CHECK (balance >= 0)
);

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credits visible to owner only"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 4. CREDIT TRANSACTIONS
-- ──────────────────────────────────────────
CREATE TYPE public.credit_tx_type AS ENUM (
  'purchase', 'deduction', 'refund', 'bonus', 'expiry'
);

CREATE TABLE public.credit_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  tx_type         public.credit_tx_type NOT NULL,
  balance_after   INTEGER NOT NULL,
  description     TEXT,
  session_id      UUID,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions visible to owner"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 5. AVATARS (face presets per user)
-- ──────────────────────────────────────────
CREATE TABLE public.avatars (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  image_url       TEXT NOT NULL,
  embedding       JSONB,
  is_preset       BOOLEAN DEFAULT FALSE,
  is_default      BOOLEAN DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avatars visible to owner"
  ON public.avatars FOR SELECT
  USING (auth.uid() = user_id OR is_preset = TRUE);

CREATE POLICY "Users can insert own avatars"
  ON public.avatars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own avatars"
  ON public.avatars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own avatars"
  ON public.avatars FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 6. VOICE PROFILES
-- ──────────────────────────────────────────
CREATE TABLE public.voice_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  audio_url       TEXT,
  style           TEXT,
  pitch_shift     NUMERIC DEFAULT 0,
  speed_factor    NUMERIC DEFAULT 1.0,
  is_preset       BOOLEAN DEFAULT FALSE,
  is_default      BOOLEAN DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice profiles visible to owner or presets"
  ON public.voice_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_preset = TRUE);

CREATE POLICY "Users can insert own voice profiles"
  ON public.voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profiles"
  ON public.voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 7. TRANSFORMATION SESSIONS
-- ──────────────────────────────────────────
CREATE TYPE public.session_status AS ENUM (
  'initializing', 'active', 'paused', 'ended', 'error'
);

CREATE TABLE public.transform_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id         UUID REFERENCES public.avatars(id),
  voice_profile_id  UUID REFERENCES public.voice_profiles(id),
  status            public.session_status DEFAULT 'initializing',
  duration_seconds  INTEGER DEFAULT 0,
  credits_used      INTEGER DEFAULT 0,
  frames_processed  INTEGER DEFAULT 0,
  avg_latency_ms    NUMERIC,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transform_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions visible to owner"
  ON public.transform_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 8. PAYMENTS
-- ──────────────────────────────────────────
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'success', 'failed', 'refunded'
);

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_ref    TEXT UNIQUE,
  amount_kobo     BIGINT NOT NULL,
  currency        TEXT DEFAULT 'NGN',
  credits_granted INTEGER NOT NULL,
  plan_name       TEXT,
  status          public.payment_status DEFAULT 'pending',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments visible to owner"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────
-- 9. UPDATED_AT TRIGGERS
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_voice_profiles_updated_at
  BEFORE UPDATE ON public.voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ──────────────────────────────────────────
-- 10. AUTO-CREATE PROFILE + CREDITS ON SIGNUP
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );

  -- Grant 50 free welcome credits
  INSERT INTO public.credits (user_id, balance, total_purchased)
  VALUES (NEW.id, 50, 50);

  -- Log bonus transaction
  INSERT INTO public.credit_transactions (user_id, amount, tx_type, balance_after, description)
  VALUES (NEW.id, 50, 'bonus', 50, 'Welcome credits — Military Pass 🎖️');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- 11. INDEXES
-- ──────────────────────────────────────────
CREATE INDEX idx_credits_user_id ON public.credits(user_id);
CREATE INDEX idx_credit_tx_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_avatars_user_id ON public.avatars(user_id);
CREATE INDEX idx_voice_user_id ON public.voice_profiles(user_id);
CREATE INDEX idx_sessions_user_id ON public.transform_sessions(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_ref ON public.payments(paystack_ref);

-- ──────────────────────────────────────────
-- 12. PRESET VOICES (seed data)
-- ──────────────────────────────────────────
-- Insert dummy system user to satisfy foreign key constraint
INSERT INTO auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system-presets@militarypass.local',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"system_presets"}'::jsonb,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.voice_profiles
  (user_id, name, style, pitch_shift, speed_factor, is_preset, id)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'Commander', 'military-deep',   -3, 0.92, TRUE, uuid_generate_v4()),
  ('00000000-0000-0000-0000-000000000000', 'Ghost',      'ghost-whisper',  -1, 0.88, TRUE, uuid_generate_v4()),
  ('00000000-0000-0000-0000-000000000000', 'Operative',  'tactical-clear',  0, 1.00, TRUE, uuid_generate_v4()),
  ('00000000-0000-0000-0000-000000000000', 'Recon',      'recon-sharp',     2, 1.10, TRUE, uuid_generate_v4()),
  ('00000000-0000-0000-0000-000000000000', 'Ranger',     'ranger-gruff',   -5, 0.85, TRUE, uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- Seed preset avatars
INSERT INTO public.avatars (user_id, name, image_url, embedding, is_preset, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'Commander', '', '{}'::jsonb, TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000000', 'Ghost',      '', '{}'::jsonb, TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000000', 'Operative',  '', '{}'::jsonb, TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000000', 'Ranger',     '', '{}'::jsonb, TRUE, FALSE)
ON CONFLICT DO NOTHING;
