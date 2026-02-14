
-- Phase 1A: Create feeder_tier enum
DO $$ BEGIN
  CREATE TYPE public.feeder_tier AS ENUM ('Feeder', 'Gold', 'Platinum', 'Diamond', 'Ultimate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Phase 1B: Alter driver_profiles with new tier columns
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS tier_status public.feeder_tier DEFAULT 'Feeder',
  ADD COLUMN IF NOT EXISTS tier_last_updated timestamptz,
  ADD COLUMN IF NOT EXISTS rolling_rating numeric,
  ADD COLUMN IF NOT EXISTS rolling_completion_rate numeric,
  ADD COLUMN IF NOT EXISTS rolling_on_time_rate numeric,
  ADD COLUMN IF NOT EXISTS rolling_cancel_rate numeric,
  ADD COLUMN IF NOT EXISTS rolling_deliveries integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_complaints_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_review_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_grace_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_weight integer DEFAULT 0;

-- Phase 1C: Create tier_history table
CREATE TABLE IF NOT EXISTS public.tier_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feeder_id uuid NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  old_tier public.feeder_tier NOT NULL,
  new_tier public.feeder_tier NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_history ENABLE ROW LEVEL SECURITY;

-- RLS: feeders can read their own history
CREATE POLICY "Feeders can view own tier history"
  ON public.tier_history FOR SELECT
  USING (
    feeder_id IN (
      SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS: admins can read all tier history
CREATE POLICY "Admins can view all tier history"
  ON public.tier_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 1D: evaluate_feeder_tier function
CREATE OR REPLACE FUNCTION public.evaluate_feeder_tier(p_feeder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_current_tier feeder_tier;
  v_new_tier feeder_tier;
  v_reason text;
  v_grace_expired boolean;
  v_dispatch_weight integer;
BEGIN
  -- Get current profile
  SELECT * INTO v_profile FROM driver_profiles WHERE id = p_feeder_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_current_tier := COALESCE(v_profile.tier_status, 'Feeder'::feeder_tier);

  -- If fraud flagged, lock tier - no promotions
  IF v_profile.fraud_flag = true THEN
    -- Log if not already logged
    IF v_current_tier != 'Feeder'::feeder_tier AND v_profile.tier_grace_period_start IS NULL THEN
      UPDATE driver_profiles SET tier_grace_period_start = now() WHERE id = p_feeder_id;
    END IF;
    RETURN;
  END IF;

  -- Determine qualified tier based on metrics
  IF v_profile.rolling_deliveries >= 1000
     AND v_profile.rolling_rating >= 4.95
     AND v_profile.rolling_completion_rate >= 98
     AND v_profile.rolling_on_time_rate >= 97
     AND v_profile.rolling_cancel_rate < 3
     AND v_profile.fraud_flag = false
     AND v_profile.tier_review_required = true  -- admin must approve
  THEN
    v_new_tier := 'Ultimate';
    v_dispatch_weight := 30;
  ELSIF v_profile.rolling_deliveries >= 500
     AND v_profile.rolling_rating >= 4.90
     AND v_profile.rolling_completion_rate >= 97
     AND v_profile.rolling_on_time_rate >= 95
     AND v_profile.rolling_cancel_rate < 5
     AND v_profile.fraud_flag = false
  THEN
    v_new_tier := 'Diamond';
    v_dispatch_weight := 18;
  ELSIF v_profile.rolling_deliveries >= 200
     AND v_profile.rolling_rating >= 4.80
     AND v_profile.rolling_completion_rate >= 95
     AND v_profile.rolling_on_time_rate >= 93
     AND v_profile.rolling_cancel_rate < 7
  THEN
    v_new_tier := 'Platinum';
    v_dispatch_weight := 10;
  ELSIF v_profile.rolling_deliveries >= 50
     AND v_profile.rolling_rating >= 4.70
     AND v_profile.rolling_completion_rate >= 90
     AND v_profile.rolling_on_time_rate >= 90
     AND v_profile.rolling_cancel_rate < 10
  THEN
    v_new_tier := 'Gold';
    v_dispatch_weight := 5;
  ELSE
    v_new_tier := 'Feeder';
    v_dispatch_weight := 0;
  END IF;

  -- Handle promotion
  IF v_new_tier > v_current_tier THEN
    -- Ultimate requires admin approval
    IF v_new_tier = 'Ultimate'::feeder_tier AND v_profile.tier_review_required = false THEN
      UPDATE driver_profiles SET tier_review_required = true WHERE id = p_feeder_id;
      RETURN;
    END IF;

    v_reason := 'Promoted: met ' || v_new_tier::text || ' requirements';
    UPDATE driver_profiles
      SET tier_status = v_new_tier,
          tier_last_updated = now(),
          dispatch_weight = v_dispatch_weight,
          tier_grace_period_start = NULL
      WHERE id = p_feeder_id;

    INSERT INTO tier_history (feeder_id, old_tier, new_tier, reason)
      VALUES (p_feeder_id, v_current_tier, v_new_tier, v_reason);

  -- Handle demotion
  ELSIF v_new_tier < v_current_tier THEN
    -- Check 7-day grace period
    IF v_profile.tier_grace_period_start IS NULL THEN
      UPDATE driver_profiles SET tier_grace_period_start = now() WHERE id = p_feeder_id;
      RETURN;
    END IF;

    v_grace_expired := (now() - v_profile.tier_grace_period_start) > interval '7 days';

    IF v_grace_expired THEN
      v_reason := 'Demoted: metrics below ' || v_current_tier::text || ' threshold for 7+ days';
      UPDATE driver_profiles
        SET tier_status = v_new_tier,
            tier_last_updated = now(),
            dispatch_weight = v_dispatch_weight,
            tier_grace_period_start = NULL
        WHERE id = p_feeder_id;

      INSERT INTO tier_history (feeder_id, old_tier, new_tier, reason)
        VALUES (p_feeder_id, v_current_tier, v_new_tier, v_reason);
    END IF;

  ELSE
    -- Tier unchanged, clear grace period
    IF v_profile.tier_grace_period_start IS NOT NULL THEN
      UPDATE driver_profiles SET tier_grace_period_start = NULL WHERE id = p_feeder_id;
    END IF;
  END IF;
END;
$$;
