-- Create driver_weekly_stats table for aggregated weekly driver performance metrics
CREATE TABLE IF NOT EXISTS public.driver_weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Monday of the week (ISO week)
  
  -- Earnings
  total_earnings_cents INTEGER DEFAULT 0,
  base_earnings_cents INTEGER DEFAULT 0,
  tips_cents INTEGER DEFAULT 0,
  bonuses_cents INTEGER DEFAULT 0,
  surge_earnings_cents INTEGER DEFAULT 0,
  
  -- Activity
  total_hours DECIMAL(6, 2) DEFAULT 0, -- Total hours worked
  active_hours DECIMAL(6, 2) DEFAULT 0, -- Hours with deliveries
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  
  -- Performance
  avg_rating DECIMAL(3, 2),
  total_ratings INTEGER DEFAULT 0,
  on_time_percentage DECIMAL(5, 2) DEFAULT 100.00,
  
  -- Distance
  total_miles DECIMAL(8, 2) DEFAULT 0,
  avg_miles_per_trip DECIMAL(6, 2) DEFAULT 0,
  
  -- Efficiency
  avg_earnings_per_hour DECIMAL(8, 2) DEFAULT 0,
  avg_earnings_per_trip DECIMAL(8, 2) DEFAULT 0,
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one record per driver per week
  UNIQUE(driver_id, week_start_date)
);

-- Add comments
COMMENT ON TABLE public.driver_weekly_stats IS 'Aggregated weekly statistics for driver performance, earnings, and activity metrics';
COMMENT ON COLUMN public.driver_weekly_stats.week_start_date IS 'Monday date of the week (ISO week start)';
COMMENT ON COLUMN public.driver_weekly_stats.total_hours IS 'Total hours driver was active/available';
COMMENT ON COLUMN public.driver_weekly_stats.active_hours IS 'Hours driver was actively making deliveries';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_weekly_stats_driver ON public.driver_weekly_stats(driver_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_weekly_stats_week ON public.driver_weekly_stats(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_weekly_stats_earnings ON public.driver_weekly_stats(total_earnings_cents DESC);

-- Enable RLS
ALTER TABLE public.driver_weekly_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can view their own weekly stats"
  ON public.driver_weekly_stats FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admins can view all weekly stats"
  ON public.driver_weekly_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'finance', 'ceo', 'analytics')
    )
  );

CREATE POLICY "System can insert/update weekly stats"
  ON public.driver_weekly_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'system')
    )
  );

