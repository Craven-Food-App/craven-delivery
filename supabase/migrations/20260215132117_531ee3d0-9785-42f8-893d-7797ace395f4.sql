
-- Step 1: Remove orphaned driver_profile
DELETE FROM public.driver_profiles WHERE user_id = 'c870d2dc-a22b-41b9-9f17-a86999debef3';

-- Step 2: Drop old check constraint
ALTER TABLE public.driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_rating_tier_check;

-- Step 3: Add V2 columns BEFORE updating data (no constraint blocking rewrite now)
ALTER TABLE public.driver_profiles 
  ADD COLUMN IF NOT EXISTS tier_status_v2 text DEFAULT 'FEEDER_PROBATIONARY',
  ADD COLUMN IF NOT EXISTS admin_approved_ultimate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimate_fail_streak_days integer DEFAULT 0;

-- Step 4: Backfill ALL data including legacy rating_tier fix
UPDATE public.driver_profiles
SET 
  rating_tier = CASE
    WHEN (total_deliveries IS NULL OR total_deliveries < 50) THEN 'Feeder'
    WHEN total_deliveries >= 1000 AND rating >= 4.95 THEN 'Ultimate'
    WHEN total_deliveries >= 500 AND rating >= 4.90 THEN 'Diamond'
    WHEN total_deliveries >= 200 AND rating >= 4.80 THEN 'Platinum'
    WHEN total_deliveries >= 50 AND rating >= 4.70 THEN 'Gold'
    ELSE 'Feeder'
  END,
  tier_status_v2 = CASE
    WHEN (total_deliveries IS NULL OR total_deliveries < 50) THEN 'FEEDER_PROBATIONARY'
    WHEN total_deliveries >= 1000 AND rating >= 4.95 THEN 'ULTIMATE'
    WHEN total_deliveries >= 500 AND rating >= 4.90 THEN 'DIAMOND'
    WHEN total_deliveries >= 200 AND rating >= 4.80 THEN 'PLATINUM'
    WHEN total_deliveries >= 50 AND rating >= 4.70 THEN 'GOLD'
    ELSE 'FEEDER_PROBATIONARY'
  END,
  tier_last_updated = now();

-- Step 5: NOW add the new check constraint after all data is clean
ALTER TABLE public.driver_profiles ADD CONSTRAINT driver_profiles_rating_tier_check
  CHECK (rating_tier = ANY (ARRAY['Feeder'::text, 'Gold'::text, 'Platinum'::text, 'Diamond'::text, 'Ultimate'::text]));

-- Step 6: Create tier_history audit table
CREATE TABLE IF NOT EXISTS public.tier_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feeder_id uuid NOT NULL,
  old_tier text NOT NULL,
  new_tier text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own tier history"
  ON public.tier_history FOR SELECT
  USING (feeder_id = auth.uid());

CREATE POLICY "System can insert tier history"
  ON public.tier_history FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tier_history_feeder_id ON public.tier_history(feeder_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_tier_v2 ON public.driver_profiles(tier_status_v2);
