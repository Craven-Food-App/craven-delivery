-- Technology Roadmap Execution Engine Tables
-- Real-time tracking, health scoring, dependencies, GitHub sync

-- Roadmap Initiatives
CREATE TABLE IF NOT EXISTS public.cto_roadmap_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4'
  year INTEGER NOT NULL,
  start_date DATE,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'blocked', 'cancelled')),
  health_score TEXT DEFAULT 'on_track' CHECK (health_score IN ('on_track', 'at_risk', 'off_track', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- GitHub Integration
  github_milestone_id INTEGER,
  github_milestone_url TEXT,
  github_issues_count INTEGER DEFAULT 0,
  github_prs_count INTEGER DEFAULT 0,
  github_deployments_count INTEGER DEFAULT 0,
  last_github_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Progress Tracking
  completed_milestones INTEGER DEFAULT 0,
  total_milestones INTEGER DEFAULT 0,
  last_progress_update TIMESTAMP WITH TIME ZONE,
  
  -- Slip Detection
  days_behind_schedule INTEGER DEFAULT 0,
  slip_detected_at TIMESTAMP WITH TIME ZONE,
  escalation_sent BOOLEAN DEFAULT false,
  escalation_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  owner_id UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Initiative Dependencies
CREATE TABLE IF NOT EXISTS public.cto_roadmap_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_initiative_id UUID REFERENCES public.cto_roadmap_initiatives(id) ON DELETE CASCADE NOT NULL,
  depends_on_initiative_id UUID REFERENCES public.cto_roadmap_initiatives(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'requires', 'related')),
  required_milestone TEXT, -- Specific milestone that must be completed
  is_blocking BOOLEAN DEFAULT true, -- If true, blocks dependent until dependency is met
  auto_block_enabled BOOLEAN DEFAULT true,
  blocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dependent_initiative_id, depends_on_initiative_id)
);

-- Initiative Milestones
CREATE TABLE IF NOT EXISTS public.cto_roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES public.cto_roadmap_initiatives(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')),
  github_issue_id INTEGER,
  github_issue_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- GitHub Sync Log
CREATE TABLE IF NOT EXISTS public.cto_github_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES public.cto_roadmap_initiatives(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('milestone', 'issue', 'pr', 'deployment', 'full')),
  github_id INTEGER,
  github_url TEXT,
  data_synced JSONB DEFAULT '{}'::jsonb,
  sync_status TEXT DEFAULT 'success' CHECK (sync_status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Slip Detection Alerts
CREATE TABLE IF NOT EXISTS public.cto_roadmap_slip_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES public.cto_roadmap_initiatives(id) ON DELETE CASCADE NOT NULL,
  days_behind INTEGER NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_message TEXT NOT NULL,
  escalation_sent BOOLEAN DEFAULT false,
  escalation_sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cto_roadmap_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_roadmap_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_roadmap_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_github_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_roadmap_slip_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "CTO can manage roadmap initiatives" ON public.cto_roadmap_initiatives;
CREATE POLICY "CTO can manage roadmap initiatives"
  ON public.cto_roadmap_initiatives FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "CTO can manage dependencies" ON public.cto_roadmap_dependencies;
CREATE POLICY "CTO can manage dependencies"
  ON public.cto_roadmap_dependencies FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "CTO can manage milestones" ON public.cto_roadmap_milestones;
CREATE POLICY "CTO can manage milestones"
  ON public.cto_roadmap_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "CTO can view sync logs" ON public.cto_github_sync_log;
CREATE POLICY "CTO can view sync logs"
  ON public.cto_github_sync_log FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "CTO can manage slip alerts" ON public.cto_roadmap_slip_alerts;
CREATE POLICY "CTO can manage slip alerts"
  ON public.cto_roadmap_slip_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes
DROP INDEX IF EXISTS idx_roadmap_initiatives_status;
CREATE INDEX idx_roadmap_initiatives_status ON public.cto_roadmap_initiatives(status);
DROP INDEX IF EXISTS idx_roadmap_initiatives_health;
CREATE INDEX idx_roadmap_initiatives_health ON public.cto_roadmap_initiatives(health_score);
DROP INDEX IF EXISTS idx_roadmap_initiatives_dates;
CREATE INDEX idx_roadmap_initiatives_dates ON public.cto_roadmap_initiatives(target_end_date, start_date);
DROP INDEX IF EXISTS idx_roadmap_dependencies_dependent;
CREATE INDEX idx_roadmap_dependencies_dependent ON public.cto_roadmap_dependencies(dependent_initiative_id);
DROP INDEX IF EXISTS idx_roadmap_dependencies_depends_on;
CREATE INDEX idx_roadmap_dependencies_depends_on ON public.cto_roadmap_dependencies(depends_on_initiative_id);
DROP INDEX IF EXISTS idx_roadmap_milestones_initiative;
CREATE INDEX idx_roadmap_milestones_initiative ON public.cto_roadmap_milestones(initiative_id);
DROP INDEX IF EXISTS idx_roadmap_milestones_status;
CREATE INDEX idx_roadmap_milestones_status ON public.cto_roadmap_milestones(status);
DROP INDEX IF EXISTS idx_roadmap_slip_alerts_initiative;
CREATE INDEX idx_roadmap_slip_alerts_initiative ON public.cto_roadmap_slip_alerts(initiative_id);
DROP INDEX IF EXISTS idx_roadmap_slip_alerts_resolved;
CREATE INDEX idx_roadmap_slip_alerts_resolved ON public.cto_roadmap_slip_alerts(resolved, escalation_sent);

-- Triggers
DROP TRIGGER IF EXISTS update_roadmap_initiatives_updated_at ON public.cto_roadmap_initiatives;
CREATE TRIGGER update_roadmap_initiatives_updated_at BEFORE UPDATE ON public.cto_roadmap_initiatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_roadmap_dependencies_updated_at ON public.cto_roadmap_dependencies;
CREATE TRIGGER update_roadmap_dependencies_updated_at BEFORE UPDATE ON public.cto_roadmap_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_roadmap_milestones_updated_at ON public.cto_roadmap_milestones;
CREATE TRIGGER update_roadmap_milestones_updated_at BEFORE UPDATE ON public.cto_roadmap_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check and update dependency blocking
CREATE OR REPLACE FUNCTION public.check_initiative_dependencies()
RETURNS TRIGGER AS $$
DECLARE
  dep_record RECORD;
  blocking_milestone_completed BOOLEAN;
BEGIN
  -- When a milestone is completed, check if it unblocks any dependent initiatives
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Find all initiatives that depend on this milestone's initiative
    FOR dep_record IN
      SELECT d.*, m.title as milestone_title
      FROM public.cto_roadmap_dependencies d
      JOIN public.cto_roadmap_milestones m ON m.initiative_id = d.depends_on_initiative_id
      WHERE d.depends_on_initiative_id = NEW.initiative_id
        AND d.is_blocking = true
        AND d.auto_block_enabled = true
        AND (d.required_milestone IS NULL OR d.required_milestone = m.title)
    LOOP
      -- Check if required milestone is completed
      IF dep_record.required_milestone IS NULL THEN
        -- No specific milestone required, check if initiative is completed
        SELECT status = 'completed' INTO blocking_milestone_completed
        FROM public.cto_roadmap_initiatives
        WHERE id = dep_record.depends_on_initiative_id;
      ELSE
        -- Specific milestone required
        SELECT status = 'completed' INTO blocking_milestone_completed
        FROM public.cto_roadmap_milestones
        WHERE initiative_id = dep_record.depends_on_initiative_id
          AND title = dep_record.required_milestone;
      END IF;

      -- If dependency is met, unblock the dependent initiative
      IF blocking_milestone_completed THEN
        UPDATE public.cto_roadmap_initiatives
        SET 
          status = CASE WHEN status = 'blocked' THEN 'in-progress' ELSE status END,
          health_score = CASE WHEN health_score = 'blocked' THEN 'on_track' ELSE health_score END
        WHERE id = dep_record.dependent_initiative_id;

        UPDATE public.cto_roadmap_dependencies
        SET unblocked_at = now()
        WHERE id = dep_record.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_dependencies_on_milestone_complete ON public.cto_roadmap_milestones;
CREATE TRIGGER check_dependencies_on_milestone_complete
  AFTER UPDATE ON public.cto_roadmap_milestones
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.check_initiative_dependencies();

