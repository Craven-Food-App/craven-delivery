-- Update payment_methods table to support Moov payment methods
-- Add Moov-specific columns and update provider references

-- Add Moov-specific columns if they don't exist
DO $$ 
BEGIN
  -- Add moov_payment_method_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'moov_payment_method_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN moov_payment_method_id TEXT;
  END IF;

  -- Add type column if it doesn't exist (card vs ach)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'type'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN type TEXT CHECK (type IN ('card', 'ach-debit-fund-source', 'ach-credit-fund-source'));
  END IF;

  -- Add bank_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN bank_name TEXT;
  END IF;

  -- Add account_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN account_type TEXT CHECK (account_type IN ('checking', 'savings'));
  END IF;
END $$;

-- Update existing payment methods to use Moov provider if they're currently Stripe
-- This is a migration step - you may want to handle this differently
UPDATE payment_methods 
SET provider = 'moov'
WHERE provider = 'stripe' AND moov_payment_method_id IS NULL;

-- Add index on moov_payment_method_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_moov_id ON payment_methods(moov_payment_method_id);

-- Add index on user_id and provider for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_provider ON payment_methods(user_id, provider);

-- Add comment to document the schema
COMMENT ON COLUMN payment_methods.moov_payment_method_id IS 'Moov.io payment method ID (card or bank account)';
COMMENT ON COLUMN payment_methods.type IS 'Payment method type: card, ach-debit-fund-source, or ach-credit-fund-source';
COMMENT ON COLUMN payment_methods.bank_name IS 'Bank name for ACH payment methods';
COMMENT ON COLUMN payment_methods.account_type IS 'Account type for ACH: checking or savings';

