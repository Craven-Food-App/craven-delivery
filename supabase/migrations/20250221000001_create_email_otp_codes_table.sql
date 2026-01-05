-- Create table for storing email OTP codes
CREATE TABLE IF NOT EXISTS email_otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_otp_expires_at ON email_otp_codes(expires_at);

-- Add RLS policies
ALTER TABLE email_otp_codes ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Service role only" ON email_otp_codes;

-- Policy: Only service role can access (edge functions use service role)
CREATE POLICY "Service role only" ON email_otp_codes
  FOR ALL
  USING (auth.role() = 'service_role');

