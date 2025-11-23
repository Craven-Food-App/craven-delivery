-- CTO Management Engine Tables
-- Performance alerts, workforce planning, task redistribution

-- Performance Alerts
CREATE TABLE IF NOT EXISTS public.cto_performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES auth.users(id) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_velocity', 'missed_pr', 'delayed_ticket', 'overloaded')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb, -- velocity, pr_count, ticket_delays, etc.
  threshold_value NUMERIC,
  actual_value NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workforce Planning Predictions
CREATE TABLE IF NOT EXISTS public.cto_workforce_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sprint_id UUID REFERENCES public.cto_sprints(id),
  predicted_burn_rate NUMERIC,
  predicted_completion_date DATE,
  staffing_gap_detected BOOLEAN DEFAULT false,
  recommended_hiring_count INTEGER DEFAULT 0,
  recommended_roles TEXT[],
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task Redistribution Suggestions
CREATE TABLE IF NOT EXISTS public.cto_redistribution_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overloaded_developer_id UUID REFERENCES auth.users(id) NOT NULL,
  suggested_reassign_to UUID REFERENCES auth.users(id),
  ticket_id UUID REFERENCES public.cto_sprint_tickets(id),
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Thresholds Configuration
CREATE TABLE IF NOT EXISTS public.cto_performance_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_type TEXT NOT NULL UNIQUE CHECK (threshold_type IN ('velocity_min', 'pr_expected_per_week', 'ticket_delay_days', 'overload_ticket_count')),
  threshold_value NUMERIC NOT NULL,
  applies_to_role TEXT[], -- ['senior', 'mid', 'junior'] or NULL for all
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default thresholds
INSERT INTO public.cto_performance_thresholds (threshold_type, threshold_value, applies_to_role) VALUES
  ('velocity_min', 10, NULL), -- Minimum 10 story points per sprint
  ('pr_expected_per_week', 2, NULL), -- At least 2 PRs per week
  ('ticket_delay_days', 3, NULL), -- Alert if ticket delayed > 3 days
  ('overload_ticket_count', 5, NULL) -- Alert if developer has > 5 active tickets
ON CONFLICT (threshold_type) DO NOTHING;

-- Enable RLS
ALTER TABLE public.cto_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_workforce_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_redistribution_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_performance_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "CTO can manage performance alerts"
  ON public.cto_performance_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR developer_id = auth.uid()
  );

CREATE POLICY "CTO can manage workforce predictions"
  ON public.cto_workforce_predictions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage redistribution suggestions"
  ON public.cto_redistribution_suggestions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR overloaded_developer_id = auth.uid()
    OR suggested_reassign_to = auth.uid()
  );

CREATE POLICY "CTO can manage performance thresholds"
  ON public.cto_performance_thresholds FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_cto_performance_alerts_developer ON public.cto_performance_alerts(developer_id);
CREATE INDEX idx_cto_performance_alerts_status ON public.cto_performance_alerts(status);
CREATE INDEX idx_cto_performance_alerts_type ON public.cto_performance_alerts(alert_type);
CREATE INDEX idx_cto_workforce_predictions_date ON public.cto_workforce_predictions(prediction_date);
CREATE INDEX idx_cto_redistribution_suggestions_status ON public.cto_redistribution_suggestions(status);
CREATE INDEX idx_cto_redistribution_suggestions_developer ON public.cto_redistribution_suggestions(overloaded_developer_id);

-- Triggers
CREATE TRIGGER update_cto_performance_alerts_updated_at BEFORE UPDATE ON public.cto_performance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cto_workforce_predictions_updated_at BEFORE UPDATE ON public.cto_workforce_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cto_redistribution_suggestions_updated_at BEFORE UPDATE ON public.cto_redistribution_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cto_performance_thresholds_updated_at BEFORE UPDATE ON public.cto_performance_thresholds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

