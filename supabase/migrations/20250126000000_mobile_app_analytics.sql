-- Mobile App Analytics Tables
-- This migration creates tables to track mobile app analytics, uptime/downtime, feature completion, and performance metrics

-- Table: mobile_app_analytics_events
-- Stores all analytics events from the mobile app
CREATE TABLE IF NOT EXISTS mobile_app_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'user_action', 'error', 'performance'
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  device_info JSONB DEFAULT '{}'::jsonb, -- { platform: 'ios'|'android', os_version, app_version }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_analytics_user_id ON mobile_app_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_driver_id ON mobile_app_analytics_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_event_type ON mobile_app_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_created_at ON mobile_app_analytics_events(created_at);

-- Table: mobile_app_uptime_downtime
-- Tracks app uptime and downtime periods
CREATE TABLE IF NOT EXISTS mobile_app_uptime_downtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'crashed', 'background')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER, -- Calculated duration in seconds
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uptime_user_id ON mobile_app_uptime_downtime(user_id);
CREATE INDEX IF NOT EXISTS idx_uptime_driver_id ON mobile_app_uptime_downtime(driver_id);
CREATE INDEX IF NOT EXISTS idx_uptime_status ON mobile_app_uptime_downtime(status);
CREATE INDEX IF NOT EXISTS idx_uptime_start_time ON mobile_app_uptime_downtime(start_time);

-- Table: mobile_app_feature_completion
-- Tracks feature usage and completion rates
CREATE TABLE IF NOT EXISTS mobile_app_feature_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  feature_name TEXT NOT NULL, -- e.g., 'order_assignment', 'delivery_completion', 'earnings_view'
  feature_status TEXT NOT NULL CHECK (feature_status IN ('started', 'completed', 'failed', 'abandoned')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  time_spent_seconds INTEGER,
  properties JSONB DEFAULT '{}'::jsonb, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_user_id ON mobile_app_feature_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_driver_id ON mobile_app_feature_completion(driver_id);
CREATE INDEX IF NOT EXISTS idx_feature_name ON mobile_app_feature_completion(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_status ON mobile_app_feature_completion(feature_status);
CREATE INDEX IF NOT EXISTS idx_feature_created_at ON mobile_app_feature_completion(created_at);

-- Table: mobile_app_performance_metrics
-- Stores performance metrics from the mobile app
CREATE TABLE IF NOT EXISTS mobile_app_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  session_id TEXT,
  load_time_ms INTEGER, -- Page/component load time in milliseconds
  render_time_ms INTEGER, -- Render time in milliseconds
  memory_usage_mb DECIMAL(10, 2), -- Memory usage in MB
  network_latency_ms INTEGER, -- Network latency in milliseconds
  api_response_time_ms INTEGER, -- API response time in milliseconds
  crash_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_user_id ON mobile_app_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_perf_driver_id ON mobile_app_performance_metrics(driver_id);
CREATE INDEX IF NOT EXISTS idx_perf_session_id ON mobile_app_performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_perf_created_at ON mobile_app_performance_metrics(created_at);

-- Table: mobile_app_error_logs
-- Stores error logs from the mobile app
CREATE TABLE IF NOT EXISTS mobile_app_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  session_id TEXT,
  error_type TEXT NOT NULL, -- 'javascript_error', 'api_error', 'network_error', 'crash'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_context JSONB DEFAULT '{}'::jsonb,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_user_id ON mobile_app_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_driver_id ON mobile_app_error_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_error_type ON mobile_app_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_created_at ON mobile_app_error_logs(created_at);

-- Enable Row Level Security
ALTER TABLE mobile_app_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_app_uptime_downtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_app_feature_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_app_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_app_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can insert their own analytics, admins can read all
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON mobile_app_analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics events" ON mobile_app_analytics_events;
DROP POLICY IF EXISTS "Users can insert their own uptime data" ON mobile_app_uptime_downtime;
DROP POLICY IF EXISTS "Users can read their own uptime data" ON mobile_app_uptime_downtime;
DROP POLICY IF EXISTS "Users can insert their own feature completion" ON mobile_app_feature_completion;
DROP POLICY IF EXISTS "Users can read their own feature completion" ON mobile_app_feature_completion;
DROP POLICY IF EXISTS "Users can insert their own performance metrics" ON mobile_app_performance_metrics;
DROP POLICY IF EXISTS "Users can read their own performance metrics" ON mobile_app_performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own error logs" ON mobile_app_error_logs;
DROP POLICY IF EXISTS "Users can read their own error logs" ON mobile_app_error_logs;

CREATE POLICY "Users can insert their own analytics events"
  ON mobile_app_analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own analytics events"
  ON mobile_app_analytics_events
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('cto', 'admin')
  ));

CREATE POLICY "Users can insert their own uptime data"
  ON mobile_app_uptime_downtime
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own uptime data"
  ON mobile_app_uptime_downtime
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('cto', 'admin')
  ));

CREATE POLICY "Users can insert their own feature completion"
  ON mobile_app_feature_completion
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own feature completion"
  ON mobile_app_feature_completion
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('cto', 'admin')
  ));

CREATE POLICY "Users can insert their own performance metrics"
  ON mobile_app_performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own performance metrics"
  ON mobile_app_performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('cto', 'admin')
  ));

CREATE POLICY "Users can insert their own error logs"
  ON mobile_app_error_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own error logs"
  ON mobile_app_error_logs
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('cto', 'admin')
  ));

-- Function to calculate daily uptime percentage
CREATE OR REPLACE FUNCTION get_daily_uptime_percentage(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_seconds BIGINT,
  online_seconds BIGINT,
  uptime_percentage DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 0) as total_seconds,
    COALESCE(SUM(CASE WHEN status = 'online' THEN EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT ELSE 0 END), 0) as online_seconds,
    CASE 
      WHEN COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 0) > 0
      THEN ROUND(
        (COALESCE(SUM(CASE WHEN status = 'online' THEN EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT ELSE 0 END), 0)::DECIMAL / 
         COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::BIGINT), 1)) * 100, 
        2
      )
      ELSE 0
    END as uptime_percentage
  FROM mobile_app_uptime_downtime
  WHERE DATE(start_time) = target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature completion statistics
CREATE OR REPLACE FUNCTION get_feature_completion_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  feature_name TEXT,
  total_attempts BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  abandoned_count BIGINT,
  completion_rate DECIMAL(5, 2),
  avg_completion_percentage DECIMAL(5, 2),
  avg_time_spent_seconds DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fac.feature_name,
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE fac.feature_status = 'completed')::BIGINT as completed_count,
    COUNT(*) FILTER (WHERE fac.feature_status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE fac.feature_status = 'abandoned')::BIGINT as abandoned_count,
    ROUND(
      (COUNT(*) FILTER (WHERE fac.feature_status = 'completed')::DECIMAL / 
       NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as completion_rate,
    ROUND(AVG(fac.completion_percentage), 2) as avg_completion_percentage,
    ROUND(AVG(fac.time_spent_seconds), 2) as avg_time_spent_seconds
  FROM mobile_app_feature_completion fac
  WHERE fac.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY fac.feature_name
  ORDER BY total_attempts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average performance metrics
CREATE OR REPLACE FUNCTION get_avg_performance_metrics(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  avg_load_time_ms DECIMAL(10, 2),
  avg_render_time_ms DECIMAL(10, 2),
  avg_memory_usage_mb DECIMAL(10, 2),
  avg_network_latency_ms DECIMAL(10, 2),
  avg_api_response_time_ms DECIMAL(10, 2),
  total_crashes BIGINT,
  total_errors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(pm.load_time_ms), 2) as avg_load_time_ms,
    ROUND(AVG(pm.render_time_ms), 2) as avg_render_time_ms,
    ROUND(AVG(pm.memory_usage_mb), 2) as avg_memory_usage_mb,
    ROUND(AVG(pm.network_latency_ms), 2) as avg_network_latency_ms,
    ROUND(AVG(pm.api_response_time_ms), 2) as avg_api_response_time_ms,
    SUM(pm.crash_count)::BIGINT as total_crashes,
    SUM(pm.error_count)::BIGINT as total_errors
  FROM mobile_app_performance_metrics pm
  WHERE pm.created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

