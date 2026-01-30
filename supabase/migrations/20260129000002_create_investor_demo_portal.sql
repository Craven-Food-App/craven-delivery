-- Investor Demo Portal System
-- Allows investors to view Customer, Merchant, and Driver experiences with mock data
-- Access via email-only magic link (no password required)

-- Table for investor demo access invites
CREATE TABLE IF NOT EXISTS public.investor_demo_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  organization TEXT,
  access_token TEXT UNIQUE NOT NULL, -- Magic link token
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '90 days'), -- 90 day expiration
  notes TEXT, -- Internal notes about the investor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS investor_demo_access_token_idx ON public.investor_demo_access(access_token);
CREATE INDEX IF NOT EXISTS investor_demo_access_email_idx ON public.investor_demo_access(email);
CREATE INDEX IF NOT EXISTS investor_demo_access_status_idx ON public.investor_demo_access(status);

-- Table for tracking investor demo access logs (analytics)
CREATE TABLE IF NOT EXISTS public.investor_demo_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_id UUID REFERENCES public.investor_demo_access(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('customer', 'merchant', 'driver')),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  session_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS investor_demo_logs_access_id_idx ON public.investor_demo_access_logs(access_id);
CREATE INDEX IF NOT EXISTS investor_demo_logs_accessed_at_idx ON public.investor_demo_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS investor_demo_logs_view_type_idx ON public.investor_demo_access_logs(view_type);

-- Function to generate secure access token
CREATE OR REPLACE FUNCTION public.generate_investor_access_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random token (32 characters)
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.investor_demo_access WHERE access_token = token) INTO exists;
    IF NOT exists THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update last accessed timestamp
CREATE OR REPLACE FUNCTION public.update_investor_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.investor_demo_access
  SET 
    last_accessed_at = now(),
    access_count = access_count + 1,
    status = 'active'
  WHERE id = NEW.access_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_investor_last_accessed ON public.investor_demo_access_logs;
CREATE TRIGGER trg_update_investor_last_accessed
AFTER INSERT ON public.investor_demo_access_logs
FOR EACH ROW EXECUTE FUNCTION public.update_investor_last_accessed();

-- Function to auto-expire old access tokens
CREATE OR REPLACE FUNCTION public.expire_old_investor_tokens()
RETURNS void AS $$
BEGIN
  UPDATE public.investor_demo_access
  SET status = 'expired'
  WHERE status IN ('invited', 'active')
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.investor_demo_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_demo_access_logs ENABLE ROW LEVEL SECURITY;

-- CEO and admins can manage investor access
CREATE POLICY "investor_demo_admin_access" ON public.investor_demo_access
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Investors can view their own access record via token (no auth required)
CREATE POLICY "investor_demo_self_view" ON public.investor_demo_access
  FOR SELECT
  USING (true); -- Public read for magic link validation

-- CEO and admins can view all access logs
CREATE POLICY "investor_demo_logs_admin_view" ON public.investor_demo_access_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Allow anyone to insert access logs (for tracking)
CREATE POLICY "investor_demo_logs_insert" ON public.investor_demo_access_logs
  FOR INSERT
  WITH CHECK (true); -- Allow public insert for tracking

-- Grant Torrance Stroman full access
GRANT ALL ON public.investor_demo_access TO postgres, authenticated, anon;
GRANT ALL ON public.investor_demo_access_logs TO postgres, authenticated, anon;

-- Create helpful view for analytics
CREATE OR REPLACE VIEW public.investor_demo_analytics AS
SELECT 
  ida.email,
  ida.full_name,
  ida.organization,
  ida.status,
  ida.invited_at,
  ida.last_accessed_at,
  ida.access_count,
  ida.expires_at,
  COUNT(DISTINCT CASE WHEN idl.view_type = 'customer' THEN idl.id END) as customer_views,
  COUNT(DISTINCT CASE WHEN idl.view_type = 'merchant' THEN idl.id END) as merchant_views,
  COUNT(DISTINCT CASE WHEN idl.view_type = 'driver' THEN idl.id END) as driver_views,
  COUNT(idl.id) as total_views,
  MAX(idl.accessed_at) as last_view_at
FROM public.investor_demo_access ida
LEFT JOIN public.investor_demo_access_logs idl ON ida.id = idl.access_id
GROUP BY ida.id, ida.email, ida.full_name, ida.organization, ida.status, 
         ida.invited_at, ida.last_accessed_at, ida.access_count, ida.expires_at;

-- Grant view access
GRANT SELECT ON public.investor_demo_analytics TO postgres, authenticated;

-- Insert comment for documentation
COMMENT ON TABLE public.investor_demo_access IS 'Investor demo portal access management - magic link authentication for investor previews';
COMMENT ON TABLE public.investor_demo_access_logs IS 'Analytics tracking for investor demo portal usage';

