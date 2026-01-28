-- ==============================================================================
-- CREATE FOUNDATIONAL DOCUMENTS TABLE
-- ==============================================================================
-- Stores generated PDFs for Foundational Invite participants.
-- This is a documentation layer only; no cap table or equity logic changes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.foundational_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_order_id UUID REFERENCES public.contribution_orders(id) ON DELETE CASCADE,
  equity_issuance_id UUID REFERENCES public.equity_issuances(id) ON DELETE SET NULL,
  contributor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_email TEXT NOT NULL,
  contributor_name TEXT,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'contribution_receipt',
      'stock_certificate',
      'participation_disclosure',
      'risk_acknowledgment'
    )
  ),
  document_title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  certificate_number TEXT,
  pool_code TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.foundational_documents ENABLE ROW LEVEL SECURITY;

-- Contributors can view their own documents (by auth.uid or email match)
CREATE POLICY "Foundational docs - contributor can view own"
ON public.foundational_documents
FOR SELECT
TO authenticated
USING (
  contributor_id = auth.uid()
  OR contributor_email = auth.jwt()->>'email'
);

-- Admin / CEO / super_admin full access
CREATE POLICY "Foundational docs - admin manage"
ON public.foundational_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'ceo', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'ceo', 'super_admin')
  )
);

COMMENT ON TABLE public.foundational_documents IS
  'Auto-generated PDF documents for Foundational Invites (contribution receipt, stock certificate, participation disclosure, risk acknowledgment).';


