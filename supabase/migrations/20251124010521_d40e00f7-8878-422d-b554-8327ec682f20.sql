-- Fix all CTO portal database errors

-- 1. Drop and recreate get_employee_clock_status to fix ambiguous column reference
DROP FUNCTION IF EXISTS public.get_employee_clock_status(UUID);

CREATE FUNCTION public.get_employee_clock_status(p_user_id UUID)
RETURNS TABLE (
  is_clocked_in BOOLEAN,
  current_entry_id UUID,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  total_hours_today NUMERIC(5, 2),
  weekly_hours NUMERIC(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM public.time_entries te1
      WHERE te1.employee_id = (SELECT id FROM public.employees WHERE user_id = p_user_id LIMIT 1)
      AND te1.status = 'clocked_in' 
      AND te1.clock_out_at IS NULL
    ) AS is_clocked_in,
    (SELECT te2.id FROM public.time_entries te2
     WHERE te2.employee_id = (SELECT id FROM public.employees WHERE user_id = p_user_id LIMIT 1)
     AND te2.status = 'clocked_in' 
     AND te2.clock_out_at IS NULL 
     ORDER BY te2.clock_in_at DESC LIMIT 1) AS current_entry_id,
    (SELECT te3.clock_in_at FROM public.time_entries te3
     WHERE te3.employee_id = (SELECT id FROM public.employees WHERE user_id = p_user_id LIMIT 1)
     AND te3.status = 'clocked_in' 
     AND te3.clock_out_at IS NULL 
     ORDER BY te3.clock_in_at DESC LIMIT 1) AS clock_in_time,
    COALESCE((
      SELECT SUM(te4.total_hours) 
      FROM public.time_entries te4
      WHERE te4.employee_id = (SELECT id FROM public.employees WHERE user_id = p_user_id LIMIT 1)
      AND DATE(te4.clock_in_at) = CURRENT_DATE
      AND te4.clock_out_at IS NOT NULL
    ), 0) AS total_hours_today,
    COALESCE((
      SELECT SUM(te5.total_hours) 
      FROM public.time_entries te5
      WHERE te5.employee_id = (SELECT id FROM public.employees WHERE user_id = p_user_id LIMIT 1)
      AND te5.clock_in_at >= date_trunc('week', CURRENT_DATE)
      AND te5.clock_out_at IS NOT NULL
    ), 0) AS weekly_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add availability_status column to cto_developers
ALTER TABLE public.cto_developers 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline'));

-- 3. Fix cto_daily_checklist priority constraint
ALTER TABLE public.cto_daily_checklist 
DROP CONSTRAINT IF EXISTS cto_daily_checklist_priority_check;

ALTER TABLE public.cto_daily_checklist 
ADD CONSTRAINT cto_daily_checklist_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- 4. Create missing CTO tables

-- CTO Performance Alerts
CREATE TABLE IF NOT EXISTS public.cto_performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_performance_alerts_developer ON public.cto_performance_alerts(developer_id);
CREATE INDEX IF NOT EXISTS idx_cto_performance_alerts_status ON public.cto_performance_alerts(status);

-- CTO Workforce Predictions
CREATE TABLE IF NOT EXISTS public.cto_workforce_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_date DATE NOT NULL,
  predicted_capacity NUMERIC(10, 2),
  predicted_velocity NUMERIC(10, 2),
  predicted_bottlenecks JSONB,
  confidence_score NUMERIC(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_workforce_predictions_date ON public.cto_workforce_predictions(prediction_date DESC);

-- CTO Redistribution Suggestions
CREATE TABLE IF NOT EXISTS public.cto_redistribution_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overloaded_developer_id UUID REFERENCES auth.users(id),
  suggested_reassign_to UUID REFERENCES auth.users(id),
  task_id UUID,
  reason TEXT NOT NULL,
  impact_score NUMERIC(3, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_redistribution_overloaded ON public.cto_redistribution_suggestions(overloaded_developer_id);
CREATE INDEX IF NOT EXISTS idx_cto_redistribution_status ON public.cto_redistribution_suggestions(status);

-- CTO Daily Reports
CREATE TABLE IF NOT EXISTS public.cto_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  completed_tasks TEXT[],
  sprint_status TEXT,
  blockers TEXT[],
  engineering_risks TEXT[],
  uptime_log TEXT,
  security_findings TEXT[],
  deployment_notes TEXT[],
  meeting_summaries TEXT[],
  next_day_priorities TEXT[],
  submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(report_date, created_by)
);

CREATE INDEX IF NOT EXISTS idx_cto_daily_reports_date ON public.cto_daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_cto_daily_reports_submitted ON public.cto_daily_reports(submitted);

-- CTO Architecture Changes
CREATE TABLE IF NOT EXISTS public.cto_architecture_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  proposed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'implementing', 'deployed', 'rolled_back', 'rejected')),
  impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  rollback_notes TEXT,
  deployed_at TIMESTAMP WITH TIME ZONE,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cto_architecture_changes_status ON public.cto_architecture_changes(status);
CREATE INDEX IF NOT EXISTS idx_cto_architecture_changes_created ON public.cto_architecture_changes(created_at DESC);

-- 5. Enable RLS on new tables
ALTER TABLE public.cto_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_workforce_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_redistribution_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_architecture_changes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (allow authenticated users to read/write CTO data)
CREATE POLICY "Allow authenticated users to read performance alerts"
  ON public.cto_performance_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage performance alerts"
  ON public.cto_performance_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read workforce predictions"
  ON public.cto_workforce_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage workforce predictions"
  ON public.cto_workforce_predictions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read redistribution suggestions"
  ON public.cto_redistribution_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage redistribution suggestions"
  ON public.cto_redistribution_suggestions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read daily reports"
  ON public.cto_daily_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage their own daily reports"
  ON public.cto_daily_reports FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow authenticated users to read architecture changes"
  ON public.cto_architecture_changes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage architecture changes"
  ON public.cto_architecture_changes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);