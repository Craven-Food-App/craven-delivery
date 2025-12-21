-- Remove Moov.io payment fields and update to Stripe-only
-- This migration removes all Moov.io integration support

-- Update payment_provider constraint to only allow 'stripe'
ALTER TABLE public.customer_orders
DROP CONSTRAINT IF EXISTS customer_orders_payment_provider_check;

ALTER TABLE public.customer_orders
ADD CONSTRAINT customer_orders_payment_provider_check 
CHECK (payment_provider IN ('stripe'));

-- Update any existing 'moov' providers to 'stripe'
UPDATE public.customer_orders 
SET payment_provider = 'stripe' 
WHERE payment_provider = 'moov';

-- Drop Moov-specific columns from customer_orders
ALTER TABLE public.customer_orders
DROP COLUMN IF EXISTS moov_payment_id,
DROP COLUMN IF EXISTS moov_transfer_id;

-- Drop Moov indexes
DROP INDEX IF EXISTS idx_customer_orders_moov_payment_id;

-- Remove Moov fields from payment_methods table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
    ALTER TABLE public.payment_methods
    DROP COLUMN IF EXISTS moov_card_id;
    
    DROP INDEX IF EXISTS idx_payment_methods_moov_card_id;
  END IF;
END $$;

