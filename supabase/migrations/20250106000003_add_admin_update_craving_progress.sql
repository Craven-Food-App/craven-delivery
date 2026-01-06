-- Admin function to update craving wheel progress for testing
-- This bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION admin_update_craving_progress(
  p_user_id UUID,
  p_current_points INTEGER DEFAULT NULL,
  p_max_points INTEGER DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO craving_wheel_progress (
    user_id,
    date,
    current_points,
    max_points,
    updated_at
  ) VALUES (
    p_user_id,
    p_date,
    COALESCE(p_current_points, 2000),
    COALESCE(p_max_points, 2000),
    NOW()
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    current_points = COALESCE(p_current_points, craving_wheel_progress.current_points),
    max_points = COALESCE(p_max_points, craving_wheel_progress.max_points),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



