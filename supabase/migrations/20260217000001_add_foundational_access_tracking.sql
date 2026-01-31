-- Add access tracking fields to foundational invites table
-- This allows tracking who accessed the portal and how many times

ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of access stats
CREATE INDEX IF NOT EXISTS invites_last_accessed_at_idx 
ON public.invites(last_accessed_at DESC);

-- Create a detailed access log table for audit trail
CREATE TABLE IF NOT EXISTS public.foundational_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES public.invites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  page_accessed TEXT, -- 'access', 'allocate', 'success'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS foundational_access_logs_invite_id_idx 
ON public.foundational_access_logs(invite_id);

CREATE INDEX IF NOT EXISTS foundational_access_logs_accessed_at_idx 
ON public.foundational_access_logs(accessed_at DESC);

-- RLS for access logs (same permissions as invites table)
ALTER TABLE public.foundational_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foundational_access_logs_admin_access" ON public.foundational_access_logs
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Create a helpful view for access analytics
CREATE OR REPLACE VIEW public.foundational_invite_analytics AS
SELECT 
  i.id,
  i.access_code,
  i.email,
  i.full_name,
  i.relationship_note,
  i.status,
  i.created_at as invited_at,
  i.accepted_at,
  i.paid_at,
  i.paid_amount_cents,
  i.expires_at,
  i.access_count,
  i.last_accessed_at,
  COUNT(fal.id) as total_page_views,
  COUNT(DISTINCT DATE(fal.accessed_at)) as unique_days_accessed,
  MIN(fal.accessed_at) as first_access_at,
  MAX(fal.accessed_at) as most_recent_access_at
FROM public.invites i
LEFT JOIN public.foundational_access_logs fal ON i.id = fal.invite_id
GROUP BY 
  i.id, i.access_code, i.email, i.full_name, i.relationship_note, 
  i.status, i.created_at, i.accepted_at, i.paid_at, i.paid_amount_cents, 
  i.expires_at, i.access_count, i.last_accessed_at;

-- Grant view access
GRANT SELECT ON public.foundational_invite_analytics TO postgres, authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.invites.access_count IS 'Number of times this invite was used to access the portal';
COMMENT ON COLUMN public.invites.last_accessed_at IS 'Most recent timestamp when this invite accessed the portal';
COMMENT ON TABLE public.foundational_access_logs IS 'Detailed audit log of all foundational invite portal access';
COMMENT ON VIEW public.foundational_invite_analytics IS 'Analytics view for tracking foundational invite usage and engagement';

