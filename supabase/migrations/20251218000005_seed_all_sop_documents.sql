-- Seed all existing SOP documents into the sop_documents table
-- This ensures all SOPs are visible in the Company Portal's SOP Documents tab

-- First, ensure the sop_documents table exists
CREATE TABLE IF NOT EXISTS public.sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  markdown_file_path TEXT,
  pdf_file_path TEXT,
  owner_department TEXT,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due_at TIMESTAMPTZ,
  review_frequency_days INTEGER DEFAULT 90,
  page_count INTEGER,
  file_size_bytes BIGINT,
  tags TEXT[],
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE public.sop_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Executives can view SOP documents" ON public.sop_documents;
DROP POLICY IF EXISTS "Executives can manage SOP documents" ON public.sop_documents;
DROP POLICY IF EXISTS "Authenticated users can view active SOPs" ON public.sop_documents;

-- Create comprehensive RLS policies
-- Policy: All authenticated users can view active SOPs
CREATE POLICY "Authenticated users can view active SOPs"
  ON public.sop_documents FOR SELECT
  TO authenticated
  USING (status = 'active' OR status = 'draft');

-- Policy: Executives can manage all SOP documents
CREATE POLICY "Executives can manage SOP documents"
  ON public.sop_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND department IN ('Finance', 'Executive', 'Operations', 'IT')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND department IN ('Finance', 'Executive', 'Operations', 'IT')
    )
  );

-- Insert/update all existing SOPs
-- 1. Investor Compliance SOP (already exists in sopContent.ts)
INSERT INTO public.sop_documents (
  title, description, category, version, status, 
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'Investor Compliance & Intake Process',
  'Complete compliance-tracked process for investor interest submissions, admin review, and portal access management per Reg D 506(b)',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_COMPLIANCE_SOP.md',
  'CFO Office',
  ARRAY['compliance', 'investor', 'intake', 'reg-d', 'portal'],
  ARRAY['investor', 'compliance', 'intake', 'reg d', '506b', 'portal', 'access', 'approval'],
  90
) ON CONFLICT DO NOTHING;

-- 2. CTO Advanced Infrastructure SOP (from docs folder)
INSERT INTO public.sop_documents (
  title, description, category, version, status,
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'CTO Advanced Infrastructure Management',
  'Operating procedures for the Advanced Infrastructure Management module including incident management, capacity planning, cost optimization, SLA management, and change management',
  'Technology',
  '1.0',
  'active',
  'SOP-CTO-Advanced-Infrastructure.md',
  'CTO Office',
  ARRAY['infrastructure', 'cto', 'operations', 'incident', 'sla', 'capacity', 'cost'],
  ARRAY['infrastructure', 'incident', 'capacity', 'cost optimization', 'SLA', 'provisioning', 'change management', 'cto'],
  90
) ON CONFLICT DO NOTHING;

-- 3. Intern Program Admin SOP (from docs folder)
INSERT INTO public.sop_documents (
  title, description, category, version, status,
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'Intern Program Admin Portal',
  'Comprehensive guide for managing the intern program including enrollment, test modules, role tracks, promotion rules, reviews, and audit logging',
  'Human Resources',
  '1.0',
  'active',
  'SOP-INTERN-PROGRAM-ADMIN.md',
  'Intern Program Administration',
  ARRAY['intern', 'hr', 'onboarding', 'admin', 'portal', 'governance'],
  ARRAY['intern', 'program', 'admin', 'test', 'module', 'promotion', 'review', 'audit', 'enrollment'],
  90
) ON CONFLICT DO NOTHING;

-- 4. Investor Experience SOP (from root folder)
INSERT INTO public.sop_documents (
  title, description, category, version, status,
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'Investor Experience Layer',
  'Compliance-safe system for managing investor interest and access to investment materials including public landing, access requests, and private overview',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_EXPERIENCE_SOP.md',
  'CFO Office',
  ARRAY['investor', 'compliance', 'portal', 'access', 'materials'],
  ARRAY['investor', 'experience', 'landing', 'access', 'request', 'overview', 'compliance', 'materials'],
  90
) ON CONFLICT DO NOTHING;

-- 5. SOP Portal Setup Guide (from root folder)
INSERT INTO public.sop_documents (
  title, description, category, version, status,
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'SOP Documents Portal Setup Guide',
  'Technical guide for setting up and maintaining the SOP Documents system including storage, database, and PDF generation',
  'IT Operations',
  '1.0',
  'active',
  'SOP_PORTAL_SETUP.md',
  'IT Department',
  ARRAY['portal', 'setup', 'admin', 'it', 'technical'],
  ARRAY['sop', 'portal', 'setup', 'storage', 'pdf', 'database', 'migration', 'sync'],
  90
) ON CONFLICT DO NOTHING;

-- 6. Admin Delivery Zones SOP (from docs folder)
INSERT INTO public.sop_documents (
  title, description, category, version, status,
  markdown_file_path, owner_department, tags, keywords,
  review_frequency_days
) VALUES (
  'Admin Portal - Delivery Zone Management',
  'Operating procedures for managing delivery zones including creating, editing, activating/deactivating zones, and using the interactive map interface',
  'Operations',
  '1.0',
  'active',
  'SOP-ADMIN-DELIVERY-ZONES.md',
  'Operations',
  ARRAY['admin', 'delivery', 'zones', 'map', 'operations', 'geography'],
  ARRAY['delivery zones', 'admin', 'map', 'polygon', 'geographic', 'coverage', 'postGIS', 'mapbox'],
  90
) ON CONFLICT DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sop_documents_status ON public.sop_documents(status);
CREATE INDEX IF NOT EXISTS idx_sop_documents_category ON public.sop_documents(category);
CREATE INDEX IF NOT EXISTS idx_sop_documents_markdown_path ON public.sop_documents(markdown_file_path);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_sop_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_sop_documents_updated_at ON public.sop_documents;
CREATE TRIGGER trigger_sop_documents_updated_at
  BEFORE UPDATE ON public.sop_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_sop_documents_updated_at();

-- Grant permissions
GRANT SELECT ON public.sop_documents TO authenticated;
GRANT ALL ON public.sop_documents TO service_role;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'SOP Documents seeded successfully. Total SOPs: %', (SELECT COUNT(*) FROM public.sop_documents);
END $$;

