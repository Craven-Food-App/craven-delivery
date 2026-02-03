-- Fix CRITICAL: Enable RLS on ceo_access_credentials table
-- This table was created with RLS disabled, exposing CEO credentials to all authenticated users
-- This migration enables RLS and restricts access appropriately

-- Enable Row Level Security
ALTER TABLE public.ceo_access_credentials ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Public can view CEO credentials" ON public.ceo_access_credentials;
DROP POLICY IF EXISTS "Authenticated users can view CEO credentials" ON public.ceo_access_credentials;

-- Policy: Only the CEO themselves or universal CEO can view their own credentials
-- Universal CEO (tstroman.ceo@cravenusa.com) can view all
CREATE POLICY "CEO can view own credentials"
ON public.ceo_access_credentials
FOR SELECT
TO authenticated
USING (
  -- Universal CEO has access to all
  public.has_universal_access()
  OR
  -- Users can only see their own credentials
  user_email = auth.jwt()->>'email'
  OR
  -- Service role access (for edge functions)
  auth.role() = 'service_role'
);

-- Policy: Only universal CEO or service role can insert/update credentials
CREATE POLICY "Only universal CEO can manage credentials"
ON public.ceo_access_credentials
FOR ALL
TO authenticated
USING (
  public.has_universal_access()
  OR auth.role() = 'service_role'
)
WITH CHECK (
  public.has_universal_access()
  OR auth.role() = 'service_role'
);

-- Update verify_ceo_pin function to use SECURITY DEFINER properly
-- This function needs to bypass RLS to check PIN hashes
CREATE OR REPLACE FUNCTION public.verify_ceo_pin(p_email TEXT, p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pin_hash TEXT;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS for PIN verification
  SELECT pin_hash INTO stored_pin_hash
  FROM public.ceo_access_credentials
  WHERE user_email = LOWER(p_email);
  
  IF stored_pin_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify PIN using crypt (bcrypt)
  IF NOT (stored_pin_hash = crypt(p_pin, stored_pin_hash)) THEN
    RETURN FALSE;
  END IF;
  
  -- Update last access time (bypasses RLS due to SECURITY DEFINER)
  UPDATE public.ceo_access_credentials
  SET 
    last_access_at = now(),
    access_count = access_count + 1
  WHERE user_email = LOWER(p_email);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update is_ceo_authorized to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_ceo_authorized(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ceo_access_credentials
    WHERE user_email = LOWER(p_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Revoke direct table access from authenticated users
-- Functions will handle access via SECURITY DEFINER
REVOKE SELECT ON public.ceo_access_credentials FROM authenticated;

-- Grant execute on functions (these use SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.verify_ceo_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ceo_authorized(TEXT) TO authenticated;

-- Add security comment
COMMENT ON TABLE public.ceo_access_credentials IS 'CEO access credentials with PIN hashes. Protected by RLS - only accessible via SECURITY DEFINER functions or by universal CEO.';
COMMENT ON FUNCTION public.verify_ceo_pin IS 'Verifies CEO PIN. Uses SECURITY DEFINER to bypass RLS for secure PIN checking.';
COMMENT ON FUNCTION public.is_ceo_authorized IS 'Checks if email is authorized CEO. Uses SECURITY DEFINER to bypass RLS.';














