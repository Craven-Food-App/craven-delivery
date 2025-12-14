-- Add stripe_customer_id column to user_profiles table for CraveMore integration

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
ON public.user_profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS 'Stripe customer ID for payment processing and subscriptions';

