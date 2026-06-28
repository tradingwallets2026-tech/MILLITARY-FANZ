-- ═══════════════════════════════════════════════════════════
-- Military Pass — Atomic Credit Functions (Supabase RPC)
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. add_credits (called from Paystack webhook) ──────────
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id      UUID,
  p_amount       INTEGER,
  p_plan_name    TEXT DEFAULT NULL,
  p_payment_ref  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create credits row if missing (safety net)
    INSERT INTO public.credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_amount, p_amount);
    v_new_balance := p_amount;
  ELSE
    v_new_balance := v_current_balance + p_amount;

    UPDATE public.credits
    SET
      balance         = v_new_balance,
      total_purchased = total_purchased + p_amount,
      updated_at      = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO public.credit_transactions
    (user_id, amount, tx_type, balance_after, description, payment_ref)
  VALUES
    (p_user_id, p_amount, 'purchase', v_new_balance,
     COALESCE('Purchased ' || p_plan_name || ' plan', 'Credit purchase'),
     p_payment_ref);

  RETURN jsonb_build_object(
    'success',      true,
    'new_balance',  v_new_balance,
    'added',        p_amount
  );
END;
$$;

-- ─── 2. deduct_credits (called during active sessions) ──────
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id   UUID,
  p_amount    INTEGER,
  p_session_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Live transformation session'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance     INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Credits record not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'error',   'Insufficient credits',
      'balance', v_current_balance,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE public.credits
  SET
    balance    = v_new_balance,
    total_used = total_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log deduction
  INSERT INTO public.credit_transactions
    (user_id, amount, tx_type, balance_after, description, session_id)
  VALUES
    (p_user_id, -p_amount, 'deduction', v_new_balance, p_description, p_session_id);

  RETURN jsonb_build_object(
    'success',     true,
    'new_balance', v_new_balance,
    'deducted',    p_amount
  );
END;
$$;

-- ─── 3. get_user_stats (dashboard aggregation) ──────────────
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits       RECORD;
  v_session_count INTEGER;
  v_total_minutes NUMERIC;
  v_avatar_count  INTEGER;
BEGIN
  SELECT balance, total_purchased, total_used
  INTO v_credits
  FROM public.credits
  WHERE user_id = p_user_id;

  SELECT
    COUNT(*),
    COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO v_session_count, v_total_minutes
  FROM public.transform_sessions
  WHERE user_id = p_user_id;

  SELECT COUNT(*)
  INTO v_avatar_count
  FROM public.avatars
  WHERE user_id = p_user_id AND is_preset = FALSE;

  RETURN jsonb_build_object(
    'balance',        COALESCE(v_credits.balance, 0),
    'total_purchased',COALESCE(v_credits.total_purchased, 0),
    'total_used',     COALESCE(v_credits.total_used, 0),
    'session_count',  v_session_count,
    'total_minutes',  ROUND(v_total_minutes::NUMERIC, 1),
    'avatar_count',   v_avatar_count
  );
END;
$$;

-- ─── 4. Grant execute permissions ───────────────────────────
GRANT EXECUTE ON FUNCTION public.add_credits     TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, INTEGER, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_stats  TO authenticated;

-- ─── 5. Supabase Storage bucket setup ───────────────────────
-- Run these in Supabase Storage UI or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true,  5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('voices',  'voices',  false, 10485760, ARRAY['audio/wav','audio/mpeg','audio/ogg'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
