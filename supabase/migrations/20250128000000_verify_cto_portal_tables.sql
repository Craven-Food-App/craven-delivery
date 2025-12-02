-- Verify all CTO Portal required tables exist
-- This migration ensures all tables exist with proper structure

-- Check and create cto_documents if missing
CREATE TABLE IF NOT EXISTS public.cto_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing tables if needed
DO $$
BEGIN
  -- Add columns to it_incidents if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'it_incidents' AND column_name = 'resolved_at') THEN
    ALTER TABLE public.it_incidents ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'it_incidents' AND column_name = 'resolved_by') THEN
    ALTER TABLE public.it_incidents ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create missing diagnostic tables if needed
CREATE TABLE IF NOT EXISTS public.error_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.root_cause_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES it_incidents(id),
  suggestion TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rollback_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES cto_architecture_changes(id),
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL,
  threshold DECIMAL,
  status TEXT,
  diagnosed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES it_incidents(id),
  escalation_reason TEXT NOT NULL,
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  escalated_to UUID REFERENCES auth.users(id)
);

-- Enable RLS on new tables
ALTER TABLE public.error_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_cause_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollback_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_documents ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies
CREATE POLICY "CTO can manage all cto_documents"
  ON public.cto_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can read all diagnostic tables"
  ON public.error_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can read root cause suggestions"
  ON public.root_cause_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can read rollback recommendations"
  ON public.rollback_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can read performance diagnostics"
  ON public.performance_diagnostics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );

CREATE POLICY "CTO can read auto escalations"
  ON public.auto_escalations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() AND role = 'cto'
    )
  );











