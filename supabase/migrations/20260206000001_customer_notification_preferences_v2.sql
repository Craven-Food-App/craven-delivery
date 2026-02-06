-- Customer Notification Preferences v2
-- Adds native push support columns, preference-checking helper function,
-- and ensures schema supports all 6 customer notification categories.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Add native push columns to push_subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS is_native BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Allow service role to manage push subscriptions (for edge functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'push_subscriptions'
    AND policyname = 'Service role can manage push subscriptions'
  ) THEN
    CREATE POLICY "Service role can manage push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.role() = 'service_role' OR public.has_universal_access());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Ensure user_notification_preferences has all required columns
-- ═══════════════════════════════════════════════════════════════════════════

-- These were added in 20260121000002 but adding IF NOT EXISTS for safety
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Make notification_setting_id nullable so new category-based rows don't require it
ALTER TABLE public.user_notification_preferences
  ALTER COLUMN notification_setting_id DROP NOT NULL;

-- Ensure unique constraint on (user_id, category) for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'user_notification_preferences_user_id_category_key'
  ) THEN
    CREATE UNIQUE INDEX user_notification_preferences_user_id_category_key
      ON public.user_notification_preferences (user_id, category);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Create helper function: check_customer_notification_preference
--    Used by edge functions and triggers to check if a customer has a
--    specific notification category enabled before sending.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_customer_notification_preference(
  p_user_id UUID,
  p_category TEXT,
  p_channel TEXT DEFAULT 'push'  -- 'push' or 'sms'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Validate category
  IF p_category NOT IN (
    'order_updates', 'store_offers', 'craven_specials',
    'suggestions', 'reminders', 'app_updates'
  ) THEN
    RAISE WARNING 'Invalid notification category: %', p_category;
    RETURN false;
  END IF;

  -- Look up preference
  IF p_channel = 'push' THEN
    SELECT push_enabled INTO v_enabled
    FROM user_notification_preferences
    WHERE user_id = p_user_id AND category = p_category;
  ELSIF p_channel = 'sms' THEN
    SELECT sms_enabled INTO v_enabled
    FROM user_notification_preferences
    WHERE user_id = p_user_id AND category = p_category;
  ELSE
    RETURN false;
  END IF;

  -- If no preference record exists, use defaults:
  -- All categories default push ON except app_updates (opt-in)
  -- SMS defaults OFF for all
  IF v_enabled IS NULL THEN
    IF p_channel = 'sms' THEN
      RETURN false;
    ELSE
      RETURN p_category != 'app_updates';
    END IF;
  END IF;

  RETURN v_enabled;
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.check_customer_notification_preference(UUID, TEXT, TEXT)
  TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Create notification_dispatch_log table for auditing
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_dispatch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,  -- 'push', 'sms', 'in_app'
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed, skipped
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own dispatch log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'notification_dispatch_log'
    AND policyname = 'Users can view own notification logs'
  ) THEN
    CREATE POLICY "Users can view own notification logs"
    ON public.notification_dispatch_log
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.has_universal_access());
  END IF;
END $$;

-- Service role can insert (edge functions write logs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'notification_dispatch_log'
    AND policyname = 'Service role can manage notification logs'
  ) THEN
    CREATE POLICY "Service role can manage notification logs"
    ON public.notification_dispatch_log
    FOR ALL
    TO authenticated
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notification_dispatch_log_user_category
  ON public.notification_dispatch_log (user_id, category, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Seed default preferences for Torrance Stroman (CEO universal access)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_ceo_id UUID;
BEGIN
  SELECT id INTO v_ceo_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF v_ceo_id IS NOT NULL THEN
    -- Ensure CEO has all notification categories enabled
    INSERT INTO user_notification_preferences (user_id, category, push_enabled, sms_enabled, updated_at)
    VALUES
      (v_ceo_id, 'order_updates', true, true, now()),
      (v_ceo_id, 'store_offers', true, false, now()),
      (v_ceo_id, 'craven_specials', true, false, now()),
      (v_ceo_id, 'suggestions', true, false, now()),
      (v_ceo_id, 'reminders', true, false, now()),
      (v_ceo_id, 'app_updates', true, false, now())
    ON CONFLICT (user_id, category) DO UPDATE
    SET push_enabled = EXCLUDED.push_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        updated_at = now();
    
    RAISE NOTICE 'CEO notification preferences seeded for %', v_ceo_id;
  END IF;
END $$;

