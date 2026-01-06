-- ON FIRE Game System - Database Functions
-- Execute this in Supabase SQL Editor

-- Function: Award wheel completion bonus
CREATE OR REPLACE FUNCTION award_wheel_completion_bonus(
  p_user_id UUID,
  p_bonus_amount DECIMAL DEFAULT 5.00
)
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Update daily performance with bonus
  INSERT INTO daily_performance (
    user_id,
    date,
    earnings
  ) VALUES (
    p_user_id,
    v_today,
    p_bonus_amount
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    earnings = daily_performance.earnings + p_bonus_amount,
    wheels_filled = daily_performance.wheels_filled + 1;
    
  -- Also update driver_earnings if that table exists
  -- (Adjust based on your actual earnings table structure)
  -- INSERT INTO driver_earnings (
  --   driver_id,
  --   amount_cents,
  --   earned_at,
  --   source
  -- ) VALUES (
  --   p_user_id,
  --   p_bonus_amount * 100,
  --   NOW(),
  --   'on_fire_bonus'
  -- );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get today's craving wheel progress
CREATE OR REPLACE FUNCTION get_today_craving_progress(
  p_user_id UUID
)
RETURNS TABLE (
  current_points INTEGER,
  max_points INTEGER,
  deliveries_completed INTEGER,
  wheels_filled INTEGER,
  current_streak INTEGER,
  speed_violations INTEGER,
  acceptance_rate DECIMAL,
  progress_percent DECIMAL
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_progress RECORD;
BEGIN
  SELECT 
    COALESCE(current_points, 0) as current_points,
    COALESCE(max_points, 2000) as max_points,
    COALESCE(deliveries_completed, 0) as deliveries_completed,
    COALESCE(wheels_filled, 0) as wheels_filled,
    COALESCE(current_streak, 0) as current_streak,
    COALESCE(speed_violations, 0) as speed_violations,
    COALESCE(acceptance_rate, 100.00) as acceptance_rate
  INTO v_progress
  FROM craving_wheel_progress
  WHERE user_id = p_user_id
    AND date = v_today;
    
  -- If no record exists, return defaults
  IF v_progress IS NULL THEN
    RETURN QUERY SELECT 
      0::INTEGER,
      2000::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::INTEGER,
      100.00::DECIMAL,
      0.00::DECIMAL;
  ELSE
    RETURN QUERY SELECT 
      v_progress.current_points,
      v_progress.max_points,
      v_progress.deliveries_completed,
      v_progress.wheels_filled,
      v_progress.current_streak,
      v_progress.speed_violations,
      v_progress.acceptance_rate,
      LEAST(100.00, (v_progress.current_points::DECIMAL / v_progress.max_points::DECIMAL) * 100.00) as progress_percent;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has exceeded violation threshold
CREATE OR REPLACE FUNCTION check_violation_threshold(
  p_user_id UUID,
  p_threshold INTEGER DEFAULT 3,
  p_hours_back INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  v_violation_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_violation_count
  FROM speed_violations
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL;
    
  IF v_violation_count >= p_threshold THEN
    -- Disable game mode
    UPDATE driver_settings
    SET on_fire_game_enabled = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate acceptance rate for user
CREATE OR REPLACE FUNCTION calculate_acceptance_rate(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_assignments INTEGER;
  v_accepted_assignments INTEGER;
  v_rate DECIMAL;
BEGIN
  -- Count total assignments in last N days
  SELECT COUNT(*)
  INTO v_total_assignments
  FROM order_assignments
  WHERE driver_id = p_user_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
    
  -- Count accepted assignments
  SELECT COUNT(*)
  INTO v_accepted_assignments
  FROM order_assignments
  WHERE driver_id = p_user_id
    AND status = 'accepted'
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
    
  -- Calculate rate
  IF v_total_assignments > 0 THEN
    v_rate := (v_accepted_assignments::DECIMAL / v_total_assignments::DECIMAL) * 100.00;
  ELSE
    v_rate := 100.00;
  END IF;
  
  RETURN LEAST(100.00, GREATEST(0.00, v_rate));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

