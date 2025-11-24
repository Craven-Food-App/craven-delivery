-- Error Tracking and Performance Monitoring System
-- For Morning Technical Review action-triggered operations

-- Error logs table for tracking all system errors
CREATE TABLE IF NOT EXISTS public.system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- 'api_error', 'database_error', 'external_api_error', 'application_error'
  endpoint TEXT, -- e.g., 'POST /orders/create'
  method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE'
  status_code INTEGER,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  request_body JSONB,
  response_body JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Error clusters - auto-grouped errors by pattern
CREATE TABLE IF NOT EXISTS public.error_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_key TEXT NOT NULL UNIQUE, -- e.g., 'POST /orders/create'
  error_type TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  total_count INTEGER DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  severity TEXT DEFAULT 'medium',
  percentage_of_total NUMERIC(5,2) DEFAULT 0, -- e.g., 95.00 for 95%
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Root cause analysis suggestions
CREATE TABLE IF NOT EXISTS public.root_cause_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_cluster_id UUID REFERENCES public.error_clusters(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('recent_deployment', 'code_change', 'database_spike', 'external_provider', 'configuration', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  related_deployment_id UUID, -- References cto_architecture_changes if applicable
  related_incident_id UUID REFERENCES public.it_incidents(id),
  evidence JSONB DEFAULT '{}'::jsonb,
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rollback recommendations
CREATE TABLE IF NOT EXISTS public.rollback_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID, -- References cto_architecture_changes
  deployment_version TEXT,
  failure_rate NUMERIC(5,2) NOT NULL, -- Percentage
  threshold_rate NUMERIC(5,2) DEFAULT 5.0, -- Default 5% failure rate threshold
  error_count INTEGER NOT NULL,
  recommendation_reason TEXT NOT NULL,
  rollback_steps TEXT[],
  estimated_downtime_minutes INTEGER,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance diagnostics
CREATE TABLE IF NOT EXISTS public.performance_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_type TEXT NOT NULL CHECK (diagnostic_type IN ('slow_query', 'high_cpu', 'memory_leak', 'failing_cron', 'database_spike', 'network_latency')),
  metric_name TEXT NOT NULL,
  current_value NUMERIC(10,2),
  threshold_value NUMERIC(10,2),
  unit TEXT, -- 'ms', 'percent', 'count', 'mb'
  trend TEXT CHECK (trend IN ('improving', 'stable', 'degrading', 'critical')),
  affected_system TEXT,
  query_text TEXT, -- For slow queries
  cron_job_name TEXT, -- For failing cron jobs
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  recommendations TEXT[],
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-escalation log
CREATE TABLE IF NOT EXISTS public.auto_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('error_rate_spike', 'uptime_drop', 'performance_degradation', 'critical_error')),
  original_severity TEXT,
  escalated_severity TEXT NOT NULL,
  escalation_reason TEXT NOT NULL,
  error_rate_before NUMERIC(5,2),
  error_rate_after NUMERIC(5,2),
  uptime_before NUMERIC(5,2),
  uptime_after NUMERIC(5,2),
  incident_id UUID REFERENCES public.it_incidents(id),
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_to UUID[], -- Array of user IDs notified
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_cause_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollback_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - CTO and admins can manage all
CREATE POLICY "CTO can manage error logs"
  ON public.system_error_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage error clusters"
  ON public.error_clusters FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage root cause suggestions"
  ON public.root_cause_suggestions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage rollback recommendations"
  ON public.rollback_recommendations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage performance diagnostics"
  ON public.performance_diagnostics FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "CTO can manage auto escalations"
  ON public.auto_escalations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto') 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_error_logs_endpoint ON public.system_error_logs(endpoint);
CREATE INDEX idx_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_error_logs_endpoint_created ON public.system_error_logs(endpoint, created_at DESC);
CREATE INDEX idx_error_clusters_last_seen ON public.error_clusters(last_seen DESC);
CREATE INDEX idx_performance_diagnostics_type ON public.performance_diagnostics(diagnostic_type, created_at DESC);
CREATE INDEX idx_auto_escalations_created ON public.auto_escalations(created_at DESC);

-- Function to update error clusters
CREATE OR REPLACE FUNCTION update_error_clusters()
RETURNS TRIGGER AS $$
DECLARE
  cluster_key TEXT;
  total_errors INTEGER;
  cluster_percentage NUMERIC;
BEGIN
  -- Generate cluster key from endpoint and method
  cluster_key := COALESCE(NEW.endpoint, 'unknown') || '|' || COALESCE(NEW.method, 'UNKNOWN');
  
  -- Get total error count in last 24 hours
  SELECT COUNT(*) INTO total_errors
  FROM public.system_error_logs
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  -- Calculate percentage
  IF total_errors > 0 THEN
    cluster_percentage := (SELECT COUNT(*)::NUMERIC / total_errors::NUMERIC * 100
      FROM public.system_error_logs
      WHERE COALESCE(endpoint, 'unknown') || '|' || COALESCE(method, 'UNKNOWN') = cluster_key
      AND created_at >= NOW() - INTERVAL '24 hours');
  ELSE
    cluster_percentage := 0;
  END IF;
  
  -- Upsert error cluster
  INSERT INTO public.error_clusters (
    cluster_key, error_type, endpoint, method, total_count, last_seen, severity, percentage_of_total
  )
  VALUES (
    cluster_key, NEW.error_type, NEW.endpoint, NEW.method, 1, NOW(), NEW.severity, cluster_percentage
  )
  ON CONFLICT (cluster_key) DO UPDATE SET
    total_count = error_clusters.total_count + 1,
    last_seen = NOW(),
    severity = CASE 
      WHEN NEW.severity = 'critical' THEN 'critical'
      WHEN NEW.severity = 'high' AND error_clusters.severity != 'critical' THEN 'high'
      WHEN NEW.severity = 'medium' AND error_clusters.severity NOT IN ('critical', 'high') THEN 'medium'
      ELSE error_clusters.severity
    END,
    percentage_of_total = cluster_percentage,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update error clusters
CREATE TRIGGER trigger_update_error_clusters
  AFTER INSERT ON public.system_error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_clusters();

-- Trigger for updated_at
CREATE TRIGGER update_error_clusters_updated_at BEFORE UPDATE ON public.error_clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_diagnostics_updated_at BEFORE UPDATE ON public.performance_diagnostics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

