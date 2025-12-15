-- Ensure cto_acknowledgments table exists with proper schema and RLS
-- This table stores CTO document acknowledgments and signatures

CREATE TABLE IF NOT EXISTS public.cto_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  agreed_checkbox BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_key)
);

-- Add comment
COMMENT ON TABLE public.cto_acknowledgments IS 'CTO document acknowledgments and signatures';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_cto_ack_user_id ON public.cto_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_cto_ack_document_key ON public.cto_acknowledgments(document_key);
CREATE INDEX IF NOT EXISTS idx_cto_ack_user_document ON public.cto_acknowledgments(user_id, document_key);

-- Enable RLS
ALTER TABLE public.cto_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own cto acknowledgments" ON public.cto_acknowledgments;
DROP POLICY IF EXISTS "Users can insert own cto acknowledgments" ON public.cto_acknowledgments;
DROP POLICY IF EXISTS "CTO can view all CTO documents" ON public.cto_acknowledgments;
DROP POLICY IF EXISTS "CTO can insert own acknowledgments" ON public.cto_acknowledgments;

-- RLS policies for CTO acknowledgments
CREATE POLICY "Users can view own cto acknowledgments"
  ON public.cto_acknowledgments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cto acknowledgments"
  ON public.cto_acknowledgments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow CTOs and admins to view all acknowledgments (for tracking purposes)
CREATE POLICY "CTOs and admins can view all cto acknowledgments"
  ON public.cto_acknowledgments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role = 'cto')
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

