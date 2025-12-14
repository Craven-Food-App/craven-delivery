-- Add step column to phone_verifications table
ALTER TABLE public.phone_verifications 
ADD COLUMN IF NOT EXISTS step INTEGER DEFAULT 1;

-- Create index for step lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_step ON public.phone_verifications(phone, email, step);

-- Update comment
COMMENT ON COLUMN public.phone_verifications.step IS 'Verification step: 1 = last 4 digits of phone, 2 = 6-digit code';



