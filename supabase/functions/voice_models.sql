-- ═══════════════════════════════════════════════════════════════
-- Military Pass — Voice Models Table
-- Personal trained RVC voice models per user
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.voice_models (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT         NOT NULL DEFAULT 'My Voice',
  status       TEXT         NOT NULL DEFAULT 'training'
                            CHECK (status IN ('training', 'ready', 'failed')),
  samples      INTEGER      DEFAULT 0,        -- number of audio files used
  n_vectors    INTEGER,                       -- FAISS index size
  trained_at   TIMESTAMPTZ,
  meta         JSONB,                         -- training metadata from Modal
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_voice_models_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_voice_models_updated_at
  BEFORE UPDATE ON public.voice_models
  FOR EACH ROW EXECUTE FUNCTION update_voice_models_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice models"
  ON public.voice_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice models"
  ON public.voice_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice models"
  ON public.voice_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice models"
  ON public.voice_models FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access voice_models"
  ON public.voice_models FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voice_models_user   ON public.voice_models (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_models_status ON public.voice_models (status);

-- ── Also add MODAL_VOICE_TRAIN_URL reminder ───────────────────────
-- After deploying workers/voice_transform.py, get the train URL:
-- modal deploy workers/voice_transform.py
-- Then add to .env.local:
-- MODAL_VOICE_TRAIN_URL=https://workspace--military-pass-voice-voice-train-api.modal.run
