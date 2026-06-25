-- ═══════════════════════════════════════════════════════════════
-- Military Pass — deduct_credits RPC
-- Called by /api/voice/train to deduct training cost
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Also add the 'enhanced' column to avatars if not present
ALTER TABLE public.avatars
  ADD COLUMN IF NOT EXISTS enhanced BOOLEAN DEFAULT FALSE;

-- ── deduct_credits RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount  INTEGER,
  p_note    TEXT DEFAULT ''
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Prevent negative balances
  UPDATE public.credits
  SET    balance = GREATEST(balance - p_amount, 0)
  WHERE  user_id = p_user_id;

  -- Log in payments table (negative amount = deduction)
  INSERT INTO public.payments (
    user_id, amount, credits, currency, reference, status, provider
  ) VALUES (
    p_user_id,
    0,               -- monetary cost = 0 (internal deduction)
    -p_amount,       -- negative = deduction
    'CREDITS',
    p_note,
    'completed',
    'system'
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, INTEGER, TEXT)
  TO authenticated, service_role;

-- ── Voice API route also needs model_id forwarded ─────────────────
-- Update the /api/ai/voice route to accept model_id (done in TS code)
-- No SQL changes needed for voice inference.
