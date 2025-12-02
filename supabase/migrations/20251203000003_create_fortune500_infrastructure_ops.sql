-- ============================================
-- FORTUNE 500 INFRASTRUCTURE OPERATIONS SYSTEM
-- ============================================
-- Comprehensive operational infrastructure management system
-- for enterprise-grade monitoring, incident management, capacity planning,
-- cost optimization, and compliance

-- Incident Management
CREATE TABLE IF NOT EXISTS public.infrastructure_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE, -- Auto-generated: INC-YYYY-######
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'postponed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('p0', 'p1', 'p2', 'p3', 'p4')),
  
  -- Affected Services
  affected_services UUID[] DEFAULT ARRAY[]::UUID[], -- References it_infrastructure.id
  service_impact TEXT, -- Description of service impact
  
  -- Timeline
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_team TEXT, -- 'sre', 'devops', 'platform', 'security'
  
  -- Resolution
  root_cause TEXT,
  resolution_notes TEXT,
  resolution_steps JSONB DEFAULT '[]'::jsonb, -- Array of resolution steps
  
  -- Impact Metrics
  affected_users INTEGER,
  revenue_impact NUMERIC(15, 2), -- Estimated revenue impact
  sla_breach BOOLEAN DEFAULT false,
  
  -- Post-Incident
  post_mortem_url TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Incident Updates/Activity Log
CREATE TABLE IF NOT EXISTS public.infrastructure_incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.infrastructure_incidents(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'comment', 'assignment', 'resolution', 'attachment')),
  content TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Tracking
CREATE TABLE IF NOT EXISTS public.infrastructure_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.it_infrastructure(id) ON DELETE CASCADE,
  sla_name TEXT NOT NULL,
  sla_type TEXT NOT NULL CHECK (sla_type IN ('uptime', 'response_time', 'throughput', 'availability')),
  target_value NUMERIC(10, 4) NOT NULL, -- e.g., 99.9 for 99.9% uptime
  measurement_period TEXT NOT NULL DEFAULT 'monthly' CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  current_value NUMERIC(10, 4),
  status TEXT DEFAULT 'meeting' CHECK (status IN ('meeting', 'at_risk', 'breached')),
  last_measured_at TIMESTAMP WITH TIME ZONE,
  breach_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Capacity Planning
CREATE TABLE IF NOT EXISTS public.infrastructure_capacity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.it_infrastructure(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'compute', 'storage', 'network', 'database'
  current_capacity NUMERIC(15, 2) NOT NULL,
  current_utilization NUMERIC(15, 2) NOT NULL,
  utilization_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE WHEN current_capacity > 0 
      THEN (current_utilization / current_capacity * 100)
      ELSE 0
    END
  ) STORED,
  projected_growth_rate NUMERIC(5, 2) DEFAULT 0, -- Monthly growth percentage
  projected_utilization_date DATE, -- When capacity will be reached
  recommended_action TEXT CHECK (recommended_action IN ('scale_up', 'scale_out', 'optimize', 'monitor', 'no_action')),
  action_priority TEXT CHECK (action_priority IN ('immediate', 'urgent', 'planned', 'monitor')),
  estimated_cost NUMERIC(15, 2), -- Cost to implement recommended action
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cost Optimization Recommendations
CREATE TABLE IF NOT EXISTS public.infrastructure_cost_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID, -- References tech_vendors.id or service_id
  resource_type TEXT NOT NULL, -- 'cloud_resource', 'service', 'vendor'
  optimization_type TEXT NOT NULL CHECK (optimization_type IN (
    'reserved_instances', 'spot_instances', 'rightsizing', 'idle_resources', 
    'storage_optimization', 'network_optimization', 'license_optimization'
  )),
  current_cost NUMERIC(15, 2) NOT NULL,
  potential_savings NUMERIC(15, 2) NOT NULL,
  savings_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE WHEN current_cost > 0 
      THEN (potential_savings / current_cost * 100)
      ELSE 0
    END
  ) STORED,
  recommendation TEXT NOT NULL,
  implementation_effort TEXT CHECK (implementation_effort IN ('low', 'medium', 'high')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'implemented', 'rejected', 'deferred')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  actual_savings NUMERIC(15, 2), -- Track actual savings after implementation
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Analytics
CREATE TABLE IF NOT EXISTS public.infrastructure_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.it_infrastructure(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'response_time', 'throughput', 'error_rate', 'cpu_usage', 'memory_usage'
  metric_value NUMERIC(15, 4) NOT NULL,
  metric_unit TEXT NOT NULL, -- 'ms', 'req/s', '%', 'bytes', 'count'
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  threshold_warning NUMERIC(15, 4),
  threshold_critical NUMERIC(15, 4),
  is_alerting BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resource Provisioning Requests
CREATE TABLE IF NOT EXISTS public.infrastructure_provisioning_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE, -- Auto-generated: PROV-YYYY-######
  request_type TEXT NOT NULL CHECK (request_type IN ('provision', 'scale', 'decommission', 'modify')),
  resource_type TEXT NOT NULL, -- 'compute', 'storage', 'database', 'network', 'service'
  provider TEXT NOT NULL, -- 'aws', 'gcp', 'azure', 'supabase', 'cloudflare', etc.
  service_name TEXT NOT NULL,
  specifications JSONB NOT NULL, -- Detailed resource specifications
  estimated_cost NUMERIC(15, 2),
  justification TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'provisioning', 'completed', 'failed', 'cancelled')),
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  provisioned_by UUID REFERENCES auth.users(id),
  provisioned_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Change Management
CREATE TABLE IF NOT EXISTS public.infrastructure_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_number TEXT NOT NULL UNIQUE, -- Auto-generated: CHG-YYYY-######
  change_type TEXT NOT NULL CHECK (change_type IN ('standard', 'normal', 'emergency')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_services UUID[] DEFAULT ARRAY[]::UUID[],
  planned_start TIMESTAMP WITH TIME ZONE NOT NULL,
  planned_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'scheduled', 'in_progress', 'completed', 'rolled_back', 'cancelled')),
  risk_assessment TEXT CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
  rollback_plan TEXT,
  testing_notes TEXT,
  implementation_notes TEXT,
  post_implementation_review TEXT,
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  implemented_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert Rules
CREATE TABLE IF NOT EXISTS public.infrastructure_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  service_id UUID REFERENCES public.it_infrastructure(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('greater_than', 'less_than', 'equals', 'not_equals', 'contains')),
  threshold_value NUMERIC(15, 4) NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  notification_channels TEXT[] DEFAULT ARRAY[]::TEXT[], -- 'email', 'slack', 'pagerduty', 'sms'
  notification_recipients UUID[] DEFAULT ARRAY[]::UUID[], -- User IDs
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 5, -- Prevent alert spam
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance & Security Monitoring
CREATE TABLE IF NOT EXISTS public.infrastructure_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  compliance_standard TEXT NOT NULL, -- 'SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS'
  service_id UUID REFERENCES public.it_infrastructure(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('security', 'data_protection', 'access_control', 'encryption', 'backup', 'audit')),
  status TEXT NOT NULL CHECK (status IN ('compliant', 'non_compliant', 'warning', 'not_applicable')),
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_check_due TIMESTAMP WITH TIME ZONE,
  findings TEXT,
  remediation_notes TEXT,
  checked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_infrastructure_incidents_status ON public.infrastructure_incidents(status);
CREATE INDEX idx_infrastructure_incidents_severity ON public.infrastructure_incidents(severity);
CREATE INDEX idx_infrastructure_incidents_created_at ON public.infrastructure_incidents(created_at DESC);
CREATE INDEX idx_infrastructure_incidents_assigned_to ON public.infrastructure_incidents(assigned_to);

CREATE INDEX idx_incident_updates_incident_id ON public.infrastructure_incident_updates(incident_id);
CREATE INDEX idx_incident_updates_created_at ON public.infrastructure_incident_updates(created_at DESC);

CREATE INDEX idx_infrastructure_slas_service_id ON public.infrastructure_slas(service_id);
CREATE INDEX idx_infrastructure_slas_status ON public.infrastructure_slas(status);

CREATE INDEX idx_capacity_plans_service_id ON public.infrastructure_capacity_plans(service_id);
CREATE INDEX idx_capacity_plans_action_priority ON public.infrastructure_capacity_plans(action_priority);

CREATE INDEX idx_cost_optimizations_status ON public.infrastructure_cost_optimizations(status);
CREATE INDEX idx_cost_optimizations_resource_type ON public.infrastructure_cost_optimizations(resource_type);

CREATE INDEX idx_performance_metrics_service_id ON public.infrastructure_performance_metrics(service_id);
CREATE INDEX idx_performance_metrics_timestamp ON public.infrastructure_performance_metrics(measurement_timestamp DESC);
CREATE INDEX idx_performance_metrics_name ON public.infrastructure_performance_metrics(metric_name);

CREATE INDEX idx_provisioning_requests_status ON public.infrastructure_provisioning_requests(status);
CREATE INDEX idx_provisioning_requests_requested_by ON public.infrastructure_provisioning_requests(requested_by);

CREATE INDEX idx_infrastructure_changes_status ON public.infrastructure_changes(status);
CREATE INDEX idx_infrastructure_changes_planned_start ON public.infrastructure_changes(planned_start);

CREATE INDEX idx_alert_rules_service_id ON public.infrastructure_alert_rules(service_id);
CREATE INDEX idx_alert_rules_is_active ON public.infrastructure_alert_rules(is_active) WHERE is_active = true;

CREATE INDEX idx_compliance_checks_service_id ON public.infrastructure_compliance_checks(service_id);
CREATE INDEX idx_compliance_checks_status ON public.infrastructure_compliance_checks(status);
CREATE INDEX idx_compliance_checks_next_due ON public.infrastructure_compliance_checks(next_check_due);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.infrastructure_incidents
  WHERE incident_number LIKE 'INC-' || year_part || '-%';
  
  RETURN 'INC-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate incident number
CREATE OR REPLACE FUNCTION set_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
    NEW.incident_number := generate_incident_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_incident_number
BEFORE INSERT ON public.infrastructure_incidents
FOR EACH ROW
EXECUTE FUNCTION set_incident_number();

-- Generate provisioning request number
CREATE OR REPLACE FUNCTION generate_provisioning_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.infrastructure_provisioning_requests
  WHERE request_number LIKE 'PROV-' || year_part || '-%';
  
  RETURN 'PROV-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_provisioning_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_provisioning_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_provisioning_number
BEFORE INSERT ON public.infrastructure_provisioning_requests
FOR EACH ROW
EXECUTE FUNCTION set_provisioning_number();

-- Generate change number
CREATE OR REPLACE FUNCTION generate_change_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(change_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.infrastructure_changes
  WHERE change_number LIKE 'CHG-' || year_part || '-%';
  
  RETURN 'CHG-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_change_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.change_number IS NULL OR NEW.change_number = '' THEN
    NEW.change_number := generate_change_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_change_number
BEFORE INSERT ON public.infrastructure_changes
FOR EACH ROW
EXECUTE FUNCTION set_change_number();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.infrastructure_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_capacity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_cost_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_provisioning_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_compliance_checks ENABLE ROW LEVEL SECURITY;

-- TORRANCE STROMAN: UNIVERSAL ACCESS
-- CTO and Infrastructure team can manage all infrastructure operations
CREATE POLICY "CTO and Infrastructure team can manage incidents"
ON public.infrastructure_incidents FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "CTO and Infrastructure team can manage incident updates"
ON public.infrastructure_incident_updates FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
  OR incident_id IN (
    SELECT id FROM public.infrastructure_incidents 
    WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

CREATE POLICY "CTO and Infrastructure team can manage SLAs"
ON public.infrastructure_slas FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
);

CREATE POLICY "CTO and Infrastructure team can manage capacity plans"
ON public.infrastructure_capacity_plans FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
);

CREATE POLICY "CTO and Infrastructure team can manage cost optimizations"
ON public.infrastructure_cost_optimizations FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto', 'cfo')
  )
);

CREATE POLICY "CTO and Infrastructure team can manage performance metrics"
ON public.infrastructure_performance_metrics FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
);

CREATE POLICY "CTO and Infrastructure team can manage provisioning requests"
ON public.infrastructure_provisioning_requests FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
  OR requested_by = auth.uid()
);

CREATE POLICY "CTO and Infrastructure team can manage changes"
ON public.infrastructure_changes FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
  OR requested_by = auth.uid()
);

CREATE POLICY "CTO and Infrastructure team can manage alert rules"
ON public.infrastructure_alert_rules FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
  OR created_by = auth.uid()
);

CREATE POLICY "CTO and Infrastructure team can manage compliance checks"
ON public.infrastructure_compliance_checks FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'cto')
  )
);

