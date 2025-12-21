-- Add Stripe fee tracking to commission_settings table
ALTER TABLE public.commission_settings 
ADD COLUMN IF NOT EXISTS stripe_fee_percent NUMERIC NOT NULL DEFAULT 2.9,
ADD COLUMN IF NOT EXISTS stripe_fee_fixed_cents INTEGER NOT NULL DEFAULT 30;

-- Update existing active settings to include Stripe fees
UPDATE public.commission_settings 
SET stripe_fee_percent = 2.9,
    stripe_fee_fixed_cents = 30
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN public.commission_settings.stripe_fee_percent IS 'Stripe processing fee percentage (e.g., 2.9 for 2.9%)';
COMMENT ON COLUMN public.commission_settings.stripe_fee_fixed_cents IS 'Stripe fixed fee per transaction in cents (e.g., 30 for $0.30)';

