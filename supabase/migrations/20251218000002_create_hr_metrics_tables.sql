-- =====================================================
-- HR METRICS DATABASE SCHEMA
-- Created: December 18, 2025
-- Purpose: Replace HR dashboard mock data with real queries
-- =====================================================

-- =====================================================
-- 1. HR MONTHLY METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_month DATE NOT NULL, -- First day of the month
  new_hires INTEGER DEFAULT 0,
  terminations INTEGER DEFAULT 0,
  promotions INTEGER DEFAULT 0,
  total_headcount INTEGER DEFAULT 0,
  turnover_rate DECIMAL(5,2), -- Percentage
  time_to_hire_days DECIMAL(5,2), -- Average days to fill position
  employee_satisfaction_score DECIMAL(3,2), -- Out of 5
  training_hours DECIMAL(8,2), -- Total training hours
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_month)
);

CREATE INDEX idx_hr_monthly_metrics_month ON public.hr_monthly_metrics(metric_month DESC);

-- =====================================================
-- 2. HR DEPARTMENT METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_department_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  metric_month DATE NOT NULL,
  headcount INTEGER DEFAULT 0,
  open_positions INTEGER DEFAULT 0,
  avg_tenure_months DECIMAL(5,1),
  turnover_rate DECIMAL(5,2),
  satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department, metric_month)
);

CREATE INDEX idx_hr_department_metrics_month ON public.hr_department_metrics(metric_month DESC);
CREATE INDEX idx_hr_department_metrics_dept ON public.hr_department_metrics(department);

-- =====================================================
-- 3. EMPLOYEE LIFECYCLE EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('hire', 'promotion', 'transfer', 'termination', 'resignation', 'retirement', 'leave_start', 'leave_end', 'performance_review', 'salary_adjustment')),
  event_date DATE NOT NULL,
  previous_position TEXT,
  new_position TEXT,
  previous_department TEXT,
  new_department TEXT,
  previous_salary DECIMAL(12,2),
  new_salary DECIMAL(12,2),
  reason TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employee_lifecycle_events_employee_id ON public.employee_lifecycle_events(employee_id);
CREATE INDEX idx_employee_lifecycle_events_event_date ON public.employee_lifecycle_events(event_date DESC);
CREATE INDEX idx_employee_lifecycle_events_event_type ON public.employee_lifecycle_events(event_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.hr_monthly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_department_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- HR and executives can view all metrics
CREATE POLICY "HR can view monthly metrics" ON public.hr_monthly_metrics FOR ALL 
  USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%HR%' OR position LIKE '%Executive%' OR position LIKE '%CEO%' OR position LIKE '%CFO%' OR position LIKE '%COO%'));

CREATE POLICY "HR can view department metrics" ON public.hr_department_metrics FOR ALL 
  USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%HR%' OR position LIKE '%Executive%' OR position LIKE '%CEO%' OR position LIKE '%CFO%' OR position LIKE '%COO%'));

CREATE POLICY "HR can view lifecycle events" ON public.employee_lifecycle_events FOR ALL 
  USING (auth.jwt()->>'email' IN (SELECT email FROM public.employees WHERE position LIKE '%HR%' OR position LIKE '%Executive%' OR position LIKE '%CEO%' OR position LIKE '%CFO%' OR position LIKE '%COO%'));

-- Employees can view their own lifecycle events
CREATE POLICY "Employees can view own lifecycle events" ON public.employee_lifecycle_events FOR SELECT 
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate and update HR metrics
CREATE OR REPLACE FUNCTION calculate_hr_monthly_metrics(target_month DATE)
RETURNS VOID AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  new_hire_count INTEGER;
  termination_count INTEGER;
  promotion_count INTEGER;
  headcount INTEGER;
  turnover DECIMAL(5,2);
BEGIN
  month_start := DATE_TRUNC('month', target_month);
  month_end := month_start + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Count new hires
  SELECT COUNT(*) INTO new_hire_count
  FROM public.employee_lifecycle_events
  WHERE event_type = 'hire'
    AND event_date >= month_start
    AND event_date <= month_end;
  
  -- Count terminations
  SELECT COUNT(*) INTO termination_count
  FROM public.employee_lifecycle_events
  WHERE event_type IN ('termination', 'resignation', 'retirement')
    AND event_date >= month_start
    AND event_date <= month_end;
  
  -- Count promotions
  SELECT COUNT(*) INTO promotion_count
  FROM public.employee_lifecycle_events
  WHERE event_type = 'promotion'
    AND event_date >= month_start
    AND event_date <= month_end;
  
  -- Get total headcount at end of month
  SELECT COUNT(*) INTO headcount
  FROM public.employees
  WHERE status = 'active';
  
  -- Calculate turnover rate
  IF headcount > 0 THEN
    turnover := (termination_count::DECIMAL / headcount) * 100;
  ELSE
    turnover := 0;
  END IF;
  
  -- Insert or update metrics
  INSERT INTO public.hr_monthly_metrics (
    metric_month,
    new_hires,
    terminations,
    promotions,
    total_headcount,
    turnover_rate
  ) VALUES (
    month_start,
    new_hire_count,
    termination_count,
    promotion_count,
    headcount,
    turnover
  )
  ON CONFLICT (metric_month) DO UPDATE SET
    new_hires = EXCLUDED.new_hires,
    terminations = EXCLUDED.terminations,
    promotions = EXCLUDED.promotions,
    total_headcount = EXCLUDED.total_headcount,
    turnover_rate = EXCLUDED.turnover_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate department metrics
CREATE OR REPLACE FUNCTION calculate_department_metrics(target_month DATE)
RETURNS VOID AS $$
DECLARE
  month_start DATE;
  dept_record RECORD;
BEGIN
  month_start := DATE_TRUNC('month', target_month);
  
  FOR dept_record IN 
    SELECT DISTINCT department FROM public.employees WHERE department IS NOT NULL
  LOOP
    INSERT INTO public.hr_department_metrics (
      department,
      metric_month,
      headcount,
      open_positions
    )
    SELECT
      dept_record.department,
      month_start,
      COUNT(*) FILTER (WHERE status = 'active'),
      0 -- TODO: Add open_positions table
    FROM public.employees
    WHERE department = dept_record.department
    ON CONFLICT (department, metric_month) DO UPDATE SET
      headcount = EXCLUDED.headcount,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_hr_monthly_metrics_updated_at 
  BEFORE UPDATE ON public.hr_monthly_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_department_metrics_updated_at 
  BEFORE UPDATE ON public.hr_department_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.hr_monthly_metrics IS 'Monthly HR metrics and KPIs';
COMMENT ON TABLE public.hr_department_metrics IS 'Department-level HR metrics';
COMMENT ON TABLE public.employee_lifecycle_events IS 'Employee lifecycle events for tracking and reporting';
COMMENT ON FUNCTION calculate_hr_monthly_metrics IS 'Calculates and updates HR metrics for a given month';
COMMENT ON FUNCTION calculate_department_metrics IS 'Calculates and updates department-level metrics';

