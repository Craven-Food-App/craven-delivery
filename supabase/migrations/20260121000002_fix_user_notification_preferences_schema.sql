-- Align user_notification_preferences schema with mobile NotificationSettings page
-- so that preferences save correctly using columns:
--   user_id, category, push_enabled, sms_enabled, updated_at

-- 1) Add missing columns if they don't exist yet
ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2) Ensure updated_at column exists (for upsert timestamps used by the app)
ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3) Create a unique index on (user_id, category) so Supabase upsert with
--    on_conflict: 'user_id,category' works without 400 errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'user_notification_preferences_user_id_category_key'
  ) THEN
    CREATE UNIQUE INDEX user_notification_preferences_user_id_category_key
      ON public.user_notification_preferences (user_id, category);
  END IF;
END $$;

-- 4) Keep existing unique(user_id, notification_setting_id) constraint in place
--    for any legacy admin-driven notification settings; the app will use the
--    (user_id, category) index for its upserts.


