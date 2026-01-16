-- Make payment_methods.token column nullable
-- This allows Stripe payment methods (which use stripe_payment_method_id instead of token)
-- to be saved without providing a token value

DO $$ 
BEGIN
  -- Check if token column exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'token'
    AND is_nullable = 'NO'
  ) THEN
    -- Make token nullable
    ALTER TABLE public.payment_methods 
    ALTER COLUMN token DROP NOT NULL;
    
    -- Add comment explaining the change
    COMMENT ON COLUMN public.payment_methods.token IS 'Payment method token (legacy field, nullable for Stripe payment methods which use stripe_payment_method_id)';
  END IF;
END $$;

