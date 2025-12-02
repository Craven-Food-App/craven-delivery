-- Executive Accountability System (EAS) Schema
-- Provides Fortune-500 compliant disciplinary, performance, and governance escalation structure

-- EAS Document Templates Table
CREATE TABLE IF NOT EXISTS public.eas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL UNIQUE, -- epm_template, ecap_template, bnnc_template, etfcn_template, policy_eas_master
  document_type TEXT NOT NULL CHECK (document_type IN ('epm', 'ecap', 'bnnc', 'etfcn', 'policy')),
  title TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  template_content TEXT NOT NULL, -- HTML content with placeholders
  created_by UUID REFERENCES public.exec_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- EAS Instances (actual issued documents)
CREATE TABLE IF NOT EXISTS public.eas_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('epm', 'ecap', 'bnnc', 'etfcn')),
  executive_id UUID REFERENCES public.exec_users(id) NOT NULL,
  issuer_id UUID REFERENCES public.exec_users(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'acknowledged', 'completed', 'escalated')),
  filled_content TEXT NOT NULL, -- Template with placeholders replaced
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Stores all placeholder values
  issued_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- EAS Workflow Tracking
CREATE TABLE IF NOT EXISTS public.eas_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID REFERENCES public.exec_users(id) NOT NULL,
  current_step TEXT NOT NULL CHECK (current_step IN ('epm_issued', 'ecap_issued', 'bnnc_issued', 'termination_for_cause', 'resolved')),
  epm_instance_id UUID REFERENCES public.eas_instances(id),
  ecap_instance_id UUID REFERENCES public.eas_instances(id),
  bnnc_instance_id UUID REFERENCES public.eas_instances(id),
  etfcn_instance_id UUID REFERENCES public.eas_instances(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(executive_id)
);

-- Enable RLS
ALTER TABLE public.eas_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eas_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eas_workflow ENABLE ROW LEVEL SECURITY;

-- RLS Policies: CEO and Board can manage, executives can view their own
-- TORRANCE STROMAN: UNIVERSAL ACCESS

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "CEO and Board can manage EAS documents" ON public.eas_documents;
DROP POLICY IF EXISTS "Executives can view EAS documents" ON public.eas_documents;
DROP POLICY IF EXISTS "CEO and Board can manage EAS instances" ON public.eas_instances;
DROP POLICY IF EXISTS "Executives can view their own instances" ON public.eas_instances;
DROP POLICY IF EXISTS "CEO and Board can manage workflow" ON public.eas_workflow;
DROP POLICY IF EXISTS "Executives can view their own workflow" ON public.eas_workflow;

CREATE POLICY "CEO and Board can manage EAS documents"
ON public.eas_documents FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'board_member')
  )
);

CREATE POLICY "Executives can view EAS documents"
ON public.eas_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "CEO and Board can manage EAS instances"
ON public.eas_instances FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'board_member')
  )
  OR executive_id IN (SELECT id FROM public.exec_users WHERE user_id = auth.uid())
);

CREATE POLICY "Executives can view their own instances"
ON public.eas_instances FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR executive_id IN (SELECT id FROM public.exec_users WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'board_member')
  )
);

CREATE POLICY "CEO and Board can manage workflow"
ON public.eas_workflow FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'board_member')
  )
);

CREATE POLICY "Executives can view their own workflow"
ON public.eas_workflow FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR executive_id IN (SELECT id FROM public.exec_users WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ceo', 'board_member')
  )
);

-- Insert default templates (will be populated by application)
-- These are placeholders - actual templates will be loaded from HTML files

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_eas_instances_executive ON public.eas_instances(executive_id);
CREATE INDEX IF NOT EXISTS idx_eas_instances_type ON public.eas_instances(document_type);
CREATE INDEX IF NOT EXISTS idx_eas_workflow_executive ON public.eas_workflow(executive_id);

