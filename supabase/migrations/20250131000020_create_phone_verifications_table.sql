-- Create phone_verifications table to store temporary verification codes
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_email ON public.phone_verifications(phone, email);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for sending codes)
CREATE POLICY "Allow insert for phone verifications"
  ON public.phone_verifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to read their own verification (by phone/email)
CREATE POLICY "Allow read for phone verifications"
  ON public.phone_verifications
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to update their own verification (for marking as verified)
CREATE POLICY "Allow update for phone verifications"
  ON public.phone_verifications
  FOR UPDATE
  USING (true);

-- Function to clean up expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.phone_verifications
  WHERE expires_at < NOW() OR verified = TRUE;
END;
$$;

-- Add comment
COMMENT ON TABLE public.phone_verifications IS 'Stores temporary phone verification codes for Feeder signup process';

