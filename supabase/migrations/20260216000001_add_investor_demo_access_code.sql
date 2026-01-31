-- Add access_code column to investor_demo_access table
-- This enables access code + email verification flow (same as foundational support)
ALTER TABLE public.investor_demo_access 
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS investor_demo_access_code_idx 
ON public.investor_demo_access(access_code);

-- Function to generate access code (similar to foundational invites)
-- Format: INV-XXXX-XXXX-XXXX
CREATE OR REPLACE FUNCTION public.generate_investor_demo_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format: INV-XXXX-XXXX-XXXX
    code := 'INV-' || 
            upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
            upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
            upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.investor_demo_access WHERE access_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update comment to reflect both access methods
COMMENT ON TABLE public.investor_demo_access IS 'Investor demo portal access management - supports both access code + email verification and magic link authentication';

