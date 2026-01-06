-- ON FIRE Game System - Complete Database Setup
-- Execute this in Supabase SQL Editor

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_violations_user_time ON speed_violations(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wheel_progress_user_date ON craving_wheel_progress(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON daily_performance(user_id, date DESC);

-- Row Level Security
ALTER TABLE driver_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE craving_wheel_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own data)
CREATE POLICY "Users can view own settings" ON driver_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON driver_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON driver_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own violations" ON speed_violations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own violations" ON speed_violations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" ON craving_wheel_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON craving_wheel_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON craving_wheel_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own performance" ON daily_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance" ON daily_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance" ON daily_performance FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_driver_settings_updated_at BEFORE UPDATE ON driver_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_craving_wheel_progress_updated_at BEFORE UPDATE ON craving_wheel_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

