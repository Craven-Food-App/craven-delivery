-- ============================================
-- ON FIRE GAME SYSTEM - COMPLETE SQL SETUP
-- ============================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- Execute in order (all at once is fine)

-- ============================================
-- PART 1: CREATE TABLES
-- ============================================

-- Table 1: Driver Settings
CREATE TABLE IF NOT EXISTS driver_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  on_fire_game_enabled BOOLEAN DEFAULT FALSE,
  speed_detection_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table 2: Speed Violations
CREATE TABLE IF NOT EXISTS speed_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  speed_limit INTEGER NOT NULL,
  actual_speed INTEGER NOT NULL,
  excess_speed INTEGER NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  points_penalty INTEGER NOT NULL,
  delivery_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table 3: Craving Wheel Progress
CREATE TABLE IF NOT EXISTS craving_wheel_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_points INTEGER DEFAULT 0,
  max_points INTEGER DEFAULT 2000,
  deliveries_completed INTEGER DEFAULT 0,
  wheels_filled INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  speed_violations INTEGER DEFAULT 0,
  total_tips DECIMAL(10,2) DEFAULT 0.00,
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table 4: Daily Performance (for the graph)
CREATE TABLE IF NOT EXISTS daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  earnings DECIMAL(10,2) DEFAULT 0.00,
  deliveries INTEGER DEFAULT 0,
  wheels_filled INTEGER DEFAULT 0,
  average_points DECIMAL(10,2) DEFAULT 0.00,
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
  speed_violations INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================
-- PART 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_violations_user_time ON speed_violations(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wheel_progress_user_date ON craving_wheel_progress(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON daily_performance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_settings_user ON driver_settings(user_id);

-- ============================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE driver_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE craving_wheel_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: CREATE RLS POLICIES
-- ============================================

-- Driver Settings Policies
DROP POLICY IF EXISTS "Users can view own settings" ON driver_settings;
CREATE POLICY "Users can view own settings" ON driver_settings 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON driver_settings;
CREATE POLICY "Users can update own settings" ON driver_settings 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON driver_settings;
CREATE POLICY "Users can insert own settings" ON driver_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Speed Violations Policies
DROP POLICY IF EXISTS "Users can view own violations" ON speed_violations;
CREATE POLICY "Users can view own violations" ON speed_violations 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own violations" ON speed_violations;
CREATE POLICY "Users can insert own violations" ON speed_violations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Craving Wheel Progress Policies
DROP POLICY IF EXISTS "Users can view own progress" ON craving_wheel_progress;
CREATE POLICY "Users can view own progress" ON craving_wheel_progress 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON craving_wheel_progress;
CREATE POLICY "Users can update own progress" ON craving_wheel_progress 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON craving_wheel_progress;
CREATE POLICY "Users can insert own progress" ON craving_wheel_progress 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Performance Policies
DROP POLICY IF EXISTS "Users can view own performance" ON daily_performance;
CREATE POLICY "Users can view own performance" ON daily_performance 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own performance" ON daily_performance;
CREATE POLICY "Users can insert own performance" ON daily_performance 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own performance" ON daily_performance;
CREATE POLICY "Users can update own performance" ON daily_performance 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PART 5: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_driver_settings_updated_at ON driver_settings;
CREATE TRIGGER update_driver_settings_updated_at 
  BEFORE UPDATE ON driver_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_craving_wheel_progress_updated_at ON craving_wheel_progress;
CREATE TRIGGER update_craving_wheel_progress_updated_at 
  BEFORE UPDATE ON craving_wheel_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- ============================================
-- VERIFICATION QUERIES (Optional - Run to verify setup)
-- ============================================

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('driver_settings', 'speed_violations', 'craving_wheel_progress', 'daily_performance');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('driver_settings', 'speed_violations', 'craving_wheel_progress', 'daily_performance');

-- Check policies exist
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('driver_settings', 'speed_violations', 'craving_wheel_progress', 'daily_performance');

-- ============================================
-- DONE! All tables, indexes, RLS, and functions created.
-- ============================================

