-- RPC Functions for Enhanced Tester Enrollment System

-- ============================================================================
-- log_tester_activity_day - Log app open (called on session init)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_tester_activity_day(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_inserted BOOLEAN := false;
BEGIN
  -- Insert with ON CONFLICT DO NOTHING (idempotent)
  INSERT INTO public.tester_activity_days (user_id, activity_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'logged', v_inserted,
    'date', v_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_tester_activity_day(UUID) TO authenticated;

-- ============================================================================
-- submit_tester_feedback - Submit micro-feedback
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_tester_feedback(
  p_user_id UUID,
  p_prompt_key TEXT,
  p_rating INTEGER DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_feedback_id UUID;
BEGIN
  INSERT INTO public.tester_feedback_events (user_id, prompt_key, rating, comment)
  VALUES (p_user_id, p_prompt_key, p_rating, p_comment)
  ON CONFLICT (user_id, prompt_key) 
  DO UPDATE SET 
    rating = COALESCE(EXCLUDED.rating, tester_feedback_events.rating),
    comment = COALESCE(EXCLUDED.comment, tester_feedback_events.comment),
    created_at = tester_feedback_events.created_at -- Keep original timestamp
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tester_feedback(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- ============================================================================
-- get_tester_progress - Get current progress for Tester Hub UI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_tester_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enrollment RECORD;
  v_activity_days_count INTEGER;
  v_feedback_count INTEGER;
  v_deadline_passed BOOLEAN;
  v_days_remaining INTEGER;
  v_tier_a_eligible BOOLEAN := false;
  v_tier_b_eligible BOOLEAN := false;
  v_tier_c_eligible BOOLEAN := false;
  v_tier_a_issued BOOLEAN := false;
  v_tier_b_issued BOOLEAN := false;
  v_tier_c_issued BOOLEAN := false;
  v_referral_stats JSONB;
BEGIN
  -- Get enrollment
  SELECT * INTO v_enrollment
  FROM public.android_tester_enrollments
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_enrolled');
  END IF;

  -- Count distinct activity days within deadline window
  SELECT COUNT(DISTINCT activity_date) INTO v_activity_days_count
  FROM public.tester_activity_days
  WHERE user_id = p_user_id
    AND activity_date >= COALESCE(v_enrollment.activated_at::DATE, CURRENT_DATE - 7)
    AND activity_date <= COALESCE(v_enrollment.deadline_at::DATE, CURRENT_DATE);

  -- Count unique feedback prompts
  SELECT COUNT(DISTINCT prompt_key) INTO v_feedback_count
  FROM public.tester_feedback_events
  WHERE user_id = p_user_id;

  -- Check deadline
  v_deadline_passed := COALESCE(v_enrollment.deadline_at < now(), false);
  v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_enrollment.deadline_at - now()))::INTEGER);

  -- Check issued tiers
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_a') INTO v_tier_a_issued;
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_b') INTO v_tier_b_issued;
  SELECT EXISTS(SELECT 1 FROM public.tester_reward_issuances WHERE user_id = p_user_id AND tier = 'tier_c') INTO v_tier_c_issued;

  -- Tier A eligibility
  v_tier_a_eligible := v_enrollment.status = 'activated'
    AND v_activity_days_count >= 3
    AND v_feedback_count >= 2
    AND NOT v_deadline_passed
    AND NOT v_tier_a_issued;

  -- Tier B eligibility (requires Tier A issued + selected)
  v_tier_b_eligible := v_tier_a_issued
    AND v_enrollment.is_selected_tester = true
    AND NOT v_tier_b_issued;

  -- Tier C eligibility check
  SELECT jsonb_build_object(
    'driver_completed', EXISTS(
      SELECT 1 FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'driver' 
        AND status = 'completed'
    ),
    'merchant_completed', EXISTS(
      SELECT 1 FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'merchant' 
        AND status = 'completed'
    ),
    'customer_count', (
      SELECT COUNT(*) FROM public.tester_referrals 
      WHERE referrer_user_id = p_user_id 
        AND referral_type = 'customer' 
        AND status = 'completed'
    )
  ) INTO v_referral_stats;

  v_tier_c_eligible := v_tier_a_issued
    AND (
      (v_referral_stats->>'driver_completed')::boolean = true
      OR (v_referral_stats->>'merchant_completed')::boolean = true
      OR ((v_referral_stats->>'customer_count')::integer >= 2)
    )
    AND NOT v_tier_c_issued;

  RETURN jsonb_build_object(
    'enrollment', jsonb_build_object(
      'status', v_enrollment.status,
      'activated_at', v_enrollment.activated_at,
      'deadline_at', v_enrollment.deadline_at,
      'is_selected_tester', v_enrollment.is_selected_tester,
      'referral_code', v_enrollment.referral_code
    ),
    'progress', jsonb_build_object(
      'activity_days', v_activity_days_count,
      'activity_days_required', 3,
      'feedback_count', v_feedback_count,
      'feedback_required', 2,
      'days_remaining', v_days_remaining,
      'deadline_passed', v_deadline_passed
    ),
    'tiers', jsonb_build_object(
      'tier_a', jsonb_build_object(
        'eligible', v_tier_a_eligible,
        'issued', v_tier_a_issued
      ),
      'tier_b', jsonb_build_object(
        'eligible', v_tier_b_eligible,
        'issued', v_tier_b_issued
      ),
      'tier_c', jsonb_build_object(
        'eligible', v_tier_c_eligible,
        'issued', v_tier_c_issued,
        'referral_stats', v_referral_stats
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tester_progress(UUID) TO authenticated;

