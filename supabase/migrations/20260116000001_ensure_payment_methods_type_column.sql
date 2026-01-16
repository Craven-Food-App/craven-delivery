-- Ensure payment_methods.type column exists
-- This migration ensures the type column exists even if previous migrations didn't run
-- or if the schema cache is stale

DO $$ 
BEGIN
  -- Add type column if it doesn't exist (card vs ach)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.payment_methods 
    ADD COLUMN type TEXT CHECK (type IN ('card', 'ach-debit-fund-source', 'ach-credit-fund-source'));
    
    -- Add comment
    COMMENT ON COLUMN public.payment_methods.type IS 'Payment method type: card, ach-debit-fund-source, or ach-credit-fund-source';
  END IF;
END $$;

