-- Create SOP Documents System for Company Portal
-- Stores metadata for Standard Operating Procedures with PDF versions

-- SOP Documents table
CREATE TABLE IF NOT EXISTS sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'Investor Relations', 'Operations', 'Compliance', 'HR', etc.
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- File references
  markdown_file_path TEXT, -- Path to .md file in repo (for reference)
  pdf_file_path TEXT, -- Path to PDF in Supabase storage
  
  -- Metadata
  owner_department TEXT, -- Department responsible for this SOP
  last_reviewed_at TIMESTAMPTZ,
  next_review_due_at TIMESTAMPTZ,
  review_frequency_days INTEGER DEFAULT 90, -- Review every 90 days by default
  
  -- Content info
  page_count INTEGER,
  file_size_bytes BIGINT,
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Search and organization
  tags TEXT[], -- Array of tags for filtering
  keywords TEXT[] -- Searchable keywords
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sop_documents_category ON sop_documents(category);
CREATE INDEX IF NOT EXISTS idx_sop_documents_status ON sop_documents(status);
CREATE INDEX IF NOT EXISTS idx_sop_documents_tags ON sop_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sop_documents_keywords ON sop_documents USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_sop_documents_created_at ON sop_documents(created_at DESC);

-- Enable RLS
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Executives can view all SOPs" ON sop_documents;
DROP POLICY IF EXISTS "Executives can create SOPs" ON sop_documents;
DROP POLICY IF EXISTS "Executives can update SOPs" ON sop_documents;

-- RLS Policies
-- Executives can view all SOPs
CREATE POLICY "Executives can view all SOPs"
  ON sop_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_BOARD_MEMBER')
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.user_id = auth.uid() 
      AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Executives can insert SOPs
CREATE POLICY "Executives can create SOPs"
  ON sop_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.user_id = auth.uid() 
      AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Executives can update SOPs
CREATE POLICY "Executives can update SOPs"
  ON sop_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.user_id = auth.uid() 
      AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
    )
    OR auth.jwt()->>'email' = 'craven@usa.com'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sop_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS sop_documents_updated_at ON sop_documents;

-- Trigger for updated_at
CREATE TRIGGER sop_documents_updated_at
  BEFORE UPDATE ON sop_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_sop_documents_updated_at();

-- Create storage bucket for SOP PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop-documents',
  'sop-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Executives can view SOP PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Executives can upload SOP PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Executives can update SOP PDFs" ON storage.objects;

-- Create RLS policies for sop-documents bucket
-- Executives can view all SOP PDFs
CREATE POLICY "Executives can view SOP PDFs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'sop-documents' AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_BOARD_MEMBER')
      )
      OR EXISTS (
        SELECT 1 FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.user_id = auth.uid() 
        AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
      )
      OR auth.jwt()->>'email' = 'craven@usa.com'
    )
  );

-- Executives can upload SOP PDFs
CREATE POLICY "Executives can upload SOP PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'sop-documents' AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
      )
      OR EXISTS (
        SELECT 1 FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.user_id = auth.uid() 
        AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
      )
      OR auth.jwt()->>'email' = 'craven@usa.com'
    )
  );

-- Executives can update SOP PDFs
CREATE POLICY "Executives can update SOP PDFs"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'sop-documents' AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'CRAVEN_EXECUTIVE', 'CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY')
      )
      OR EXISTS (
        SELECT 1 FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.user_id = auth.uid() 
        AND (d.name = 'Finance' OR d.name = 'Executive' OR d.name = 'Operations')
      )
      OR auth.jwt()->>'email' = 'craven@usa.com'
    )
  );

-- Insert the Investor Compliance SOP as the first document
-- Use ON CONFLICT with a unique constraint or just insert if not exists
INSERT INTO sop_documents (
  title,
  description,
  category,
  version,
  status,
  markdown_file_path,
  owner_department,
  tags,
  keywords
) 
SELECT 
  'Investor Compliance & Intake Process',
  'Standard Operating Procedure for investor interest submissions, compliance tracking, and portal access management',
  'Investor Relations',
  '1.0',
  'active',
  'INVESTOR_COMPLIANCE_SOP.md',
  'Finance',
  ARRAY['investor', 'compliance', 'reg-d', 'intake', 'portal'],
  ARRAY['investor', 'compliance', 'reg d', '506b', 'intake', 'portal', 'cfo', 'approval', 'acknowledgment']
WHERE NOT EXISTS (
  SELECT 1 FROM sop_documents 
  WHERE markdown_file_path = 'INVESTOR_COMPLIANCE_SOP.md'
);

