-- ============================================
-- FORTUNE 500 DEVOPS & CI/CD OPERATIONS SYSTEM
-- ============================================
-- Comprehensive operational DevOps & CI/CD management system
-- for enterprise-grade pipeline management, build automation,
-- test management, release orchestration, and delivery performance

-- CI/CD Pipelines
CREATE TABLE IF NOT EXISTS public.devops_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name TEXT NOT NULL,
  pipeline_key TEXT NOT NULL UNIQUE, -- Unique identifier (e.g., 'main', 'feature-auth', 'release-v2.0')
  description TEXT,
  
  -- Configuration
  repository_url TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  trigger_type TEXT NOT NULL DEFAULT 'push' CHECK (trigger_type IN ('push', 'pull_request', 'schedule', 'manual', 'webhook')),
  trigger_config JSONB DEFAULT '{}'::jsonb, -- Branch patterns, schedules, etc.
  
  -- Pipeline Definition
  pipeline_yaml TEXT, -- YAML definition of pipeline steps
  stages JSONB DEFAULT '[]'::jsonb, -- Array of stage definitions
  steps JSONB DEFAULT '[]'::jsonb, -- Array of step definitions
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'draft')),
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running', 'cancelled', 'skipped')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_duration INTEGER, -- Duration in seconds
  
  -- Statistics
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  avg_duration INTEGER, -- Average duration in seconds
  
  -- Notifications
  notification_config JSONB DEFAULT '{}'::jsonb, -- Slack, email, webhook configs
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Builds
CREATE TABLE IF NOT EXISTS public.devops_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_number TEXT NOT NULL, -- Auto-generated: BUILD-YYYYMMDD-######
  pipeline_id UUID REFERENCES public.devops_pipelines(id) ON DELETE CASCADE,
  
  -- Build Info
  branch TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_message TEXT,
  commit_author TEXT,
  commit_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled', 'skipped')),
  stage TEXT, -- Current stage if running
  
  -- Timing
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in seconds
  
  -- Build Artifacts
  artifacts JSONB DEFAULT '[]'::jsonb, -- Array of artifact info {name, url, size, type}
  artifact_storage_url TEXT,
  
  -- Build Logs
  logs_url TEXT, -- URL to build logs
  logs_summary TEXT, -- Summary of logs (errors, warnings)
  
  -- Test Results Summary
  tests_total INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  tests_skipped INTEGER DEFAULT 0,
  test_coverage NUMERIC(5, 2), -- Coverage percentage
  
  -- Quality Gates
  quality_gate_status TEXT CHECK (quality_gate_status IN ('passed', 'failed', 'warning')),
  quality_gate_details JSONB DEFAULT '{}'::jsonb,
  
  -- Trigger Info
  triggered_by UUID REFERENCES auth.users(id),
  triggered_by_type TEXT DEFAULT 'system' CHECK (triggered_by_type IN ('system', 'user', 'webhook', 'schedule')),
  trigger_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(pipeline_id, build_number)
);

-- Test Runs
CREATE TABLE IF NOT EXISTS public.devops_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_number TEXT NOT NULL, -- Auto-generated: TEST-YYYYMMDD-######
  build_id UUID REFERENCES public.devops_builds(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.devops_pipelines(id) ON DELETE CASCADE,
  
  -- Test Suite Info
  test_suite_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('unit', 'integration', 'e2e', 'performance', 'security', 'regression')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'skipped', 'cancelled')),
  
  -- Results
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  duration INTEGER, -- Duration in seconds
  
  -- Coverage
  coverage_percentage NUMERIC(5, 2),
  coverage_report_url TEXT,
  
  -- Test Details
  test_results JSONB DEFAULT '[]'::jsonb, -- Array of individual test results
  failures JSONB DEFAULT '[]'::jsonb, -- Array of failure details
  
  -- Performance Metrics
  avg_response_time NUMERIC(10, 2), -- Average response time in ms
  p95_response_time NUMERIC(10, 2),
  p99_response_time NUMERIC(10, 2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Releases
CREATE TABLE IF NOT EXISTS public.devops_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_number TEXT NOT NULL UNIQUE, -- Version number (e.g., 'v2.1.0', '2024.12.03')
  release_name TEXT,
  description TEXT,
  
  -- Release Type
  release_type TEXT NOT NULL CHECK (release_type IN ('major', 'minor', 'patch', 'hotfix', 'pre-release')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'deployed', 'rolled_back', 'cancelled')),
  
  -- Build Reference
  build_id UUID REFERENCES public.devops_builds(id),
  pipeline_id UUID REFERENCES public.devops_pipelines(id),
  
  -- Deployment
  target_environment TEXT NOT NULL CHECK (target_environment IN ('development', 'staging', 'production', 'qa')),
  deployment_strategy TEXT DEFAULT 'rolling' CHECK (deployment_strategy IN ('rolling', 'blue-green', 'canary', 'recreate')),
  
  -- Schedule
  scheduled_at TIMESTAMP WITH TIME ZONE,
  deployed_at TIMESTAMP WITH TIME ZONE,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  
  -- Release Notes
  release_notes TEXT,
  changelog JSONB DEFAULT '[]'::jsonb, -- Array of changes
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_required BOOLEAN DEFAULT true,
  
  -- Rollback Info
  rollback_reason TEXT,
  rollback_initiated_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Environments
CREATE TABLE IF NOT EXISTS public.devops_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_name TEXT NOT NULL UNIQUE, -- 'production', 'staging', 'development', 'qa'
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Environment Type
  environment_type TEXT NOT NULL CHECK (environment_type IN ('production', 'staging', 'development', 'qa', 'demo', 'testing')),
  
  -- Infrastructure
  infrastructure_provider TEXT, -- 'aws', 'azure', 'gcp', 'on-premise'
  region TEXT,
  cluster_name TEXT,
  namespace TEXT,
  
  -- Configuration
  config_vars JSONB DEFAULT '{}'::jsonb, -- Environment variables, configs
  secrets_managed_by TEXT, -- 'vault', 'aws-secrets-manager', 'k8s-secrets'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'degraded', 'down')),
  health_status TEXT CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_health_check TIMESTAMP WITH TIME ZONE,
  
  -- Current Deployment
  current_release_id UUID REFERENCES public.devops_releases(id),
  current_build_id UUID REFERENCES public.devops_builds(id),
  deployed_at TIMESTAMP WITH TIME ZONE,
  
  -- Access Control
  access_restricted BOOLEAN DEFAULT false,
  allowed_users UUID[] DEFAULT ARRAY[]::UUID[],
  allowed_teams TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Monitoring
  monitoring_url TEXT,
  logs_url TEXT,
  metrics_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security Scans
CREATE TABLE IF NOT EXISTS public.devops_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_number TEXT NOT NULL, -- Auto-generated: SCAN-YYYYMMDD-######
  build_id UUID REFERENCES public.devops_builds(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.devops_pipelines(id) ON DELETE CASCADE,
  
  -- Scan Info
  scan_type TEXT NOT NULL CHECK (scan_type IN ('sast', 'dast', 'dependency', 'container', 'secrets', 'compliance')),
  scanner_tool TEXT NOT NULL, -- 'snyk', 'veracode', 'sonarqube', 'trivy', etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  -- Results
  vulnerabilities_critical INTEGER DEFAULT 0,
  vulnerabilities_high INTEGER DEFAULT 0,
  vulnerabilities_medium INTEGER DEFAULT 0,
  vulnerabilities_low INTEGER DEFAULT 0,
  vulnerabilities_info INTEGER DEFAULT 0,
  total_vulnerabilities INTEGER DEFAULT 0,
  
  -- Scan Details
  scan_results JSONB DEFAULT '[]'::jsonb, -- Array of vulnerability details
  compliance_status TEXT CHECK (compliance_status IN ('compliant', 'non-compliant', 'partial')),
  compliance_details JSONB DEFAULT '{}'::jsonb,
  
  -- Action Required
  action_required BOOLEAN DEFAULT false,
  blocking BOOLEAN DEFAULT false, -- Blocks deployment if true
  
  -- Metadata
  scan_config JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS public.devops_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES public.devops_builds(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.devops_pipelines(id) ON DELETE CASCADE,
  environment_id UUID REFERENCES public.devops_environments(id) ON DELETE SET NULL,
  
  -- Metric Type
  metric_type TEXT NOT NULL CHECK (metric_type IN ('build_time', 'deployment_time', 'test_execution_time', 'api_response_time', 'page_load_time', 'throughput')),
  
  -- Values
  metric_value NUMERIC(15, 4) NOT NULL,
  metric_unit TEXT NOT NULL, -- 'seconds', 'milliseconds', 'requests_per_second', etc.
  
  -- Context
  stage TEXT, -- Pipeline stage
  service_name TEXT, -- Service/component name
  endpoint TEXT, -- API endpoint if applicable
  
  -- Comparison
  baseline_value NUMERIC(15, 4), -- Baseline for comparison
  threshold_value NUMERIC(15, 4), -- Alert threshold
  threshold_exceeded BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Deployment Notifications
CREATE TABLE IF NOT EXISTS public.devops_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('build_started', 'build_completed', 'build_failed', 'deployment_started', 'deployment_completed', 'deployment_failed', 'release_created', 'rollback_initiated', 'security_alert', 'performance_alert')),
  
  -- References
  build_id UUID REFERENCES public.devops_builds(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.devops_releases(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.devops_pipelines(id) ON DELETE CASCADE,
  
  -- Notification Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  
  -- Channels
  channels TEXT[] DEFAULT ARRAY[]::TEXT[], -- 'slack', 'email', 'webhook', 'sms'
  sent_to JSONB DEFAULT '[]'::jsonb, -- Array of recipients
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_devops_pipelines_status ON public.devops_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_devops_pipelines_branch ON public.devops_pipelines(branch);
CREATE INDEX IF NOT EXISTS idx_devops_builds_pipeline_id ON public.devops_builds(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_devops_builds_status ON public.devops_builds(status);
CREATE INDEX IF NOT EXISTS idx_devops_builds_branch ON public.devops_builds(branch);
CREATE INDEX IF NOT EXISTS idx_devops_builds_created_at ON public.devops_builds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devops_test_runs_build_id ON public.devops_test_runs(build_id);
CREATE INDEX IF NOT EXISTS idx_devops_test_runs_status ON public.devops_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_devops_releases_status ON public.devops_releases(status);
CREATE INDEX IF NOT EXISTS idx_devops_releases_environment ON public.devops_releases(target_environment);
CREATE INDEX IF NOT EXISTS idx_devops_environments_type ON public.devops_environments(environment_type);
CREATE INDEX IF NOT EXISTS idx_devops_security_scans_build_id ON public.devops_security_scans(build_id);
CREATE INDEX IF NOT EXISTS idx_devops_security_scans_status ON public.devops_security_scans(status);
CREATE INDEX IF NOT EXISTS idx_devops_performance_metrics_build_id ON public.devops_performance_metrics(build_id);
CREATE INDEX IF NOT EXISTS idx_devops_performance_metrics_recorded_at ON public.devops_performance_metrics(recorded_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate build number
CREATE OR REPLACE FUNCTION generate_build_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.build_number IS NULL OR NEW.build_number = '' THEN
    NEW.build_number := 'BUILD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('build_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for build numbers
CREATE SEQUENCE IF NOT EXISTS build_number_seq START 1;

-- Trigger for build number generation
DROP TRIGGER IF EXISTS trigger_generate_build_number ON public.devops_builds;
CREATE TRIGGER trigger_generate_build_number
  BEFORE INSERT ON public.devops_builds
  FOR EACH ROW
  EXECUTE FUNCTION generate_build_number();

-- Auto-generate test run number
CREATE OR REPLACE FUNCTION generate_test_run_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.test_run_number IS NULL OR NEW.test_run_number = '' THEN
    NEW.test_run_number := 'TEST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('test_run_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS test_run_number_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_test_run_number ON public.devops_test_runs;
CREATE TRIGGER trigger_generate_test_run_number
  BEFORE INSERT ON public.devops_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION generate_test_run_number();

-- Auto-generate security scan number
CREATE OR REPLACE FUNCTION generate_security_scan_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scan_number IS NULL OR NEW.scan_number = '' THEN
    NEW.scan_number := 'SCAN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('security_scan_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS security_scan_number_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_security_scan_number ON public.devops_security_scans;
CREATE TRIGGER trigger_generate_security_scan_number
  BEFORE INSERT ON public.devops_security_scans
  FOR EACH ROW
  EXECUTE FUNCTION generate_security_scan_number();

-- Update pipeline statistics on build completion
CREATE OR REPLACE FUNCTION update_pipeline_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('success', 'failed', 'cancelled') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    UPDATE public.devops_pipelines
    SET
      total_runs = total_runs + 1,
      successful_runs = CASE WHEN NEW.status = 'success' THEN successful_runs + 1 ELSE successful_runs END,
      failed_runs = CASE WHEN NEW.status = 'failed' THEN failed_runs + 1 ELSE failed_runs END,
      last_run_status = NEW.status,
      last_run_at = NEW.completed_at,
      last_run_duration = NEW.duration,
      avg_duration = CASE
        WHEN total_runs = 0 THEN NEW.duration
        ELSE (avg_duration * (total_runs - 1) + NEW.duration) / total_runs
      END,
      updated_at = NOW()
    WHERE id = NEW.pipeline_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pipeline_statistics ON public.devops_builds;
CREATE TRIGGER trigger_update_pipeline_statistics
  AFTER UPDATE ON public.devops_builds
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_statistics();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.devops_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devops_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for devops_pipelines
DROP POLICY IF EXISTS "CTO and DevOps can manage pipelines" ON public.devops_pipelines;
CREATE POLICY "CTO and DevOps can manage pipelines" ON public.devops_pipelines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view pipelines" ON public.devops_pipelines;
CREATE POLICY "All authenticated users can view pipelines" ON public.devops_pipelines
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_builds
DROP POLICY IF EXISTS "CTO and DevOps can manage builds" ON public.devops_builds;
CREATE POLICY "CTO and DevOps can manage builds" ON public.devops_builds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view builds" ON public.devops_builds;
CREATE POLICY "All authenticated users can view builds" ON public.devops_builds
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_test_runs
DROP POLICY IF EXISTS "CTO and DevOps can manage test runs" ON public.devops_test_runs;
CREATE POLICY "CTO and DevOps can manage test runs" ON public.devops_test_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view test runs" ON public.devops_test_runs;
CREATE POLICY "All authenticated users can view test runs" ON public.devops_test_runs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_releases
DROP POLICY IF EXISTS "CTO and DevOps can manage releases" ON public.devops_releases;
CREATE POLICY "CTO and DevOps can manage releases" ON public.devops_releases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view releases" ON public.devops_releases;
CREATE POLICY "All authenticated users can view releases" ON public.devops_releases
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_environments
DROP POLICY IF EXISTS "CTO and DevOps can manage environments" ON public.devops_environments;
CREATE POLICY "CTO and DevOps can manage environments" ON public.devops_environments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view environments" ON public.devops_environments;
CREATE POLICY "All authenticated users can view environments" ON public.devops_environments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_security_scans
DROP POLICY IF EXISTS "CTO and DevOps can manage security scans" ON public.devops_security_scans;
CREATE POLICY "CTO and DevOps can manage security scans" ON public.devops_security_scans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view security scans" ON public.devops_security_scans;
CREATE POLICY "All authenticated users can view security scans" ON public.devops_security_scans
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_performance_metrics
DROP POLICY IF EXISTS "CTO and DevOps can manage performance metrics" ON public.devops_performance_metrics;
CREATE POLICY "CTO and DevOps can manage performance metrics" ON public.devops_performance_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view performance metrics" ON public.devops_performance_metrics;
CREATE POLICY "All authenticated users can view performance metrics" ON public.devops_performance_metrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for devops_notifications
DROP POLICY IF EXISTS "CTO and DevOps can manage notifications" ON public.devops_notifications;
CREATE POLICY "CTO and DevOps can manage notifications" ON public.devops_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cto', 'ceo')
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

DROP POLICY IF EXISTS "All authenticated users can view notifications" ON public.devops_notifications;
CREATE POLICY "All authenticated users can view notifications" ON public.devops_notifications
  FOR SELECT
  USING (auth.role() = 'authenticated');


