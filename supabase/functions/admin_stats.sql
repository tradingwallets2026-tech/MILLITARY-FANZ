-- ═══════════════════════════════════════════════════════════════
-- Military Pass — Admin SQL Functions
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Add is_admin column to profiles ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ─── 2. Admin: User Stats ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total     INTEGER;
  v_today     INTEGER;
  v_active_7d INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.profiles;

  SELECT COUNT(*) INTO v_today
  FROM public.profiles
  WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(DISTINCT user_id) INTO v_active_7d
  FROM public.transform_sessions
  WHERE created_at >= NOW() - INTERVAL '7 days';

  RETURN jsonb_build_object(
    'total_users',      v_total,
    'new_users_today',  v_today,
    'active_users_7d',  v_active_7d
  );
END;
$$;

-- ─── 3. Admin: Revenue Stats ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revenue_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue  BIGINT;
  v_today_revenue  BIGINT;
  v_credits_sold   BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_kobo), 0) INTO v_total_revenue
  FROM public.payments
  WHERE status = 'success';

  SELECT COALESCE(SUM(amount_kobo), 0) INTO v_today_revenue
  FROM public.payments
  WHERE status = 'success' AND created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(credits_granted), 0) INTO v_credits_sold
  FROM public.payments
  WHERE status = 'success';

  RETURN jsonb_build_object(
    'total_revenue_kobo',  v_total_revenue,
    'revenue_today_kobo',  v_today_revenue,
    'total_credits_sold',  v_credits_sold
  );
END;
$$;

-- ─── 4. Admin: Session Stats ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_session_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total   INTEGER;
  v_today   INTEGER;
  v_avg_min NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.transform_sessions;

  SELECT COUNT(*) INTO v_today
  FROM public.transform_sessions
  WHERE created_at >= CURRENT_DATE;

  SELECT ROUND(COALESCE(AVG(duration_seconds) / 60.0, 0)::NUMERIC, 1) INTO v_avg_min
  FROM public.transform_sessions
  WHERE duration_seconds IS NOT NULL;

  RETURN jsonb_build_object(
    'total_sessions',      v_total,
    'sessions_today',      v_today,
    'avg_session_minutes', v_avg_min
  );
END;
$$;

-- ─── 5. Grant admin RPC to service_role only ─────────────────────
GRANT EXECUTE ON FUNCTION public.admin_user_stats    TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revenue_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_session_stats TO service_role;

-- ─── 6. Add credits_granted to payments table ────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS credits_granted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency        TEXT    DEFAULT 'ngn';

-- ─── 7. Set your account as admin ────────────────────────────────
-- Replace with your actual user ID from Supabase Auth:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = 'YOUR-USER-UUID';
