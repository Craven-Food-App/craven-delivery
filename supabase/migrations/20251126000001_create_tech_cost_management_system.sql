-- Tech Cost Management System - Automated Financial Operations
-- This migration creates the complete infrastructure for automated cost tracking, alerts, and optimization

-- Tech cost categories
CREATE TABLE IF NOT EXISTS public.tech_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES public.tech_cost_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tech budgets (enhanced from existing budgets table)
CREATE TABLE IF NOT EXISTS public.tech_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tech_cost_categories(id),
  period TEXT NOT NULL, -- 'YYYY-MM' format
  budgeted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, period)
);

-- Tech vendors and services (must be created before tech_actual_costs)
CREATE TABLE IF NOT EXISTS public.tech_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  category_id UUID REFERENCES public.tech_cost_categories(id),
  monthly_cost NUMERIC(12, 2) NOT NULL,
  annual_cost NUMERIC(12, 2),
  contract_start_date DATE,
  contract_end_date DATE,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual', 'usage-based', 'one-time')),
  is_active BOOLEAN DEFAULT true,
  is_shadow_tool BOOLEAN DEFAULT false, -- Detected unauthorized tool
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Actual tech costs
CREATE TABLE IF NOT EXISTS public.tech_actual_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tech_cost_categories(id),
  vendor_id UUID REFERENCES public.tech_vendors(id),
  period TEXT NOT NULL, -- 'YYYY-MM' format
  amount NUMERIC(12, 2) NOT NULL,
  usage_metrics JSONB DEFAULT '{}'::jsonb, -- e.g., {"storage_gb": 200, "api_calls": 1000000}
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Software licenses tracking
CREATE TABLE IF NOT EXISTS public.tech_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.tech_vendors(id),
  license_type TEXT NOT NULL, -- 'seat', 'concurrent', 'enterprise', 'usage-based'
  total_licenses INTEGER NOT NULL,
  used_licenses INTEGER DEFAULT 0,
  unused_licenses INTEGER GENERATED ALWAYS AS (total_licenses - used_licenses) STORED,
  cost_per_license NUMERIC(12, 2),
  last_usage_check TIMESTAMP WITH TIME ZONE,
  optimization_recommendation TEXT, -- 'downgrade', 'cancel', 'optimize'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cost alerts (auto-generated)
CREATE TABLE IF NOT EXISTS public.tech_cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('overage', 'variance', 'vendor_optimization', 'license_optimization', 'shadow_tool')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  category_id UUID REFERENCES public.tech_cost_categories(id),
  vendor_id UUID REFERENCES public.tech_vendors(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  variance_percentage NUMERIC(5, 2), -- e.g., 5.5 for 5.5%
  estimated_impact NUMERIC(12, 2), -- Estimated cost impact
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cost forecasts (predictive analytics)
CREATE TABLE IF NOT EXISTS public.tech_cost_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tech_cost_categories(id),
  forecast_period TEXT NOT NULL, -- 'YYYY-MM'
  forecasted_amount NUMERIC(12, 2) NOT NULL,
  confidence_level NUMERIC(5, 2) DEFAULT 0.85, -- 0-1 scale
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('burn_rate', 'infrastructure', 'scaling', 'optimization')),
  assumptions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert notification log
CREATE TABLE IF NOT EXISTS public.tech_cost_alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.tech_cost_alerts(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack')),
  recipient_email TEXT,
  slack_channel TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tech_budgets_period ON public.tech_budgets(period);
CREATE INDEX IF NOT EXISTS idx_tech_budgets_category ON public.tech_budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_tech_actual_costs_period ON public.tech_actual_costs(period);
CREATE INDEX IF NOT EXISTS idx_tech_actual_costs_category ON public.tech_actual_costs(category_id);
CREATE INDEX IF NOT EXISTS idx_tech_actual_costs_vendor ON public.tech_actual_costs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tech_vendors_category ON public.tech_vendors(category_id);
CREATE INDEX IF NOT EXISTS idx_tech_vendors_active ON public.tech_vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_tech_licenses_vendor ON public.tech_licenses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tech_cost_alerts_status ON public.tech_cost_alerts(status);
CREATE INDEX IF NOT EXISTS idx_tech_cost_alerts_type ON public.tech_cost_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_tech_cost_alerts_created ON public.tech_cost_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_cost_forecasts_period ON public.tech_cost_forecasts(forecast_period);
CREATE INDEX IF NOT EXISTS idx_tech_cost_forecasts_category ON public.tech_cost_forecasts(category_id);

-- RLS Policies
ALTER TABLE public.tech_cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_actual_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_cost_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_cost_alert_notifications ENABLE ROW LEVEL SECURITY;

-- CTO and CFO can read all
CREATE POLICY "CTO and CFO can read tech costs"
  ON public.tech_cost_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read budgets"
  ON public.tech_budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read actual costs"
  ON public.tech_actual_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read vendors"
  ON public.tech_vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read licenses"
  ON public.tech_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read alerts"
  ON public.tech_cost_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

CREATE POLICY "CTO and CFO can read forecasts"
  ON public.tech_cost_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE user_id = auth.uid()
      AND role IN ('cto', 'cfo', 'ceo')
    )
  );

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access categories"
  ON public.tech_cost_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access budgets"
  ON public.tech_budgets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access actual costs"
  ON public.tech_actual_costs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access vendors"
  ON public.tech_vendors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access licenses"
  ON public.tech_licenses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access alerts"
  ON public.tech_cost_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access forecasts"
  ON public.tech_cost_forecasts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access notifications"
  ON public.tech_cost_alert_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default cost categories
INSERT INTO public.tech_cost_categories (name, description) VALUES
  ('Cloud Infrastructure', 'Supabase, Vercel, AWS, etc.'),
  ('Software Licenses', 'SaaS subscriptions and licenses'),
  ('Development Tools', 'GitHub, IDE licenses, etc.'),
  ('Security Tools', 'Security monitoring and compliance tools'),
  ('Monitoring & Analytics', 'Error tracking, analytics, monitoring'),
  ('Storage', 'File storage, database storage, backups')
ON CONFLICT (name) DO NOTHING;

-- Function to calculate variance and create alerts
CREATE OR REPLACE FUNCTION public.check_cost_variances()
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  budgeted NUMERIC,
  actual NUMERIC,
  variance NUMERIC,
  variance_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS period
  ),
  budget_data AS (
    SELECT 
      b.category_id,
      c.name AS category_name,
      COALESCE(SUM(b.budgeted_amount), 0) AS budgeted
    FROM public.tech_budgets b
    JOIN public.tech_cost_categories c ON c.id = b.category_id
    JOIN current_period cp ON b.period = cp.period
    GROUP BY b.category_id, c.name
  ),
  actual_data AS (
    SELECT 
      a.category_id,
      COALESCE(SUM(a.amount), 0) AS actual
    FROM public.tech_actual_costs a
    JOIN current_period cp ON a.period = cp.period
    GROUP BY a.category_id
  )
  SELECT 
    bd.category_id,
    bd.category_name,
    bd.budgeted,
    COALESCE(ad.actual, 0) AS actual,
    COALESCE(ad.actual, 0) - bd.budgeted AS variance,
    CASE 
      WHEN bd.budgeted > 0 THEN ((COALESCE(ad.actual, 0) - bd.budgeted) / bd.budgeted * 100)
      ELSE 0
    END AS variance_pct
  FROM budget_data bd
  LEFT JOIN actual_data ad ON bd.category_id = ad.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create alerts for variances > 5%
CREATE OR REPLACE FUNCTION public.auto_create_cost_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
  variance_record RECORD;
BEGIN
  FOR variance_record IN 
    SELECT * FROM public.check_cost_variances()
    WHERE ABS(variance_pct) >= 5.0
  LOOP
    INSERT INTO public.tech_cost_alerts (
      alert_type,
      severity,
      category_id,
      title,
      message,
      variance_percentage,
      estimated_impact
    ) VALUES (
      'variance',
      CASE 
        WHEN ABS(variance_record.variance_pct) >= 20 THEN 'critical'
        WHEN ABS(variance_record.variance_pct) >= 10 THEN 'warning'
        ELSE 'info'
      END,
      variance_record.category_id,
      format('%s is %.1f%% %s budget', 
        variance_record.category_name,
        ABS(variance_record.variance_pct),
        CASE WHEN variance_record.variance_pct > 0 THEN 'over' ELSE 'under' END
      ),
      format('%s: Budgeted $%.2f, Actual $%.2f. Variance: $%.2f (%.1f%%)',
        variance_record.category_name,
        variance_record.budgeted,
        variance_record.actual,
        variance_record.variance,
        variance_record.variance_pct
      ),
      variance_record.variance_pct,
      ABS(variance_record.variance)
    )
    ON CONFLICT DO NOTHING;
    
    alert_count := alert_count + 1;
  END LOOP;
  
  RETURN alert_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

