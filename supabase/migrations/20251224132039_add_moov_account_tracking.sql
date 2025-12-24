-- Add Moov account tracking to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS moov_account_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_invite_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moov_capabilities jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_fee_plan_codes text[] DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.restaurants.moov_account_id IS 'Moov account ID after onboarding completion';
COMMENT ON COLUMN public.restaurants.moov_onboarding_invite_code IS 'Moov onboarding invite code for tracking';
COMMENT ON COLUMN public.restaurants.moov_onboarding_status IS 'Moov onboarding status: pending, completed, revoked, failed';
COMMENT ON COLUMN public.restaurants.moov_onboarding_complete IS 'Whether Moov onboarding is complete';
COMMENT ON COLUMN public.restaurants.moov_capabilities IS 'JSON array of enabled Moov capabilities';
COMMENT ON COLUMN public.restaurants.moov_fee_plan_codes IS 'Array of Moov fee plan codes assigned to this account';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_moov_account_id ON public.restaurants(moov_account_id) WHERE moov_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_moov_invite_code ON public.restaurants(moov_onboarding_invite_code) WHERE moov_onboarding_invite_code IS NOT NULL;

