-- ========================================
-- Gas Money Complete Database Setup
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- STEP 1: Create Gas Money Tables
-- ========================================

-- Create driver_gas_money table for tracking accumulated mileage earnings
CREATE TABLE IF NOT EXISTS driver_gas_money (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0, -- Balance in cents
  total_accumulated INTEGER NOT NULL DEFAULT 0, -- Total ever accumulated in cents
  total_transferred INTEGER NOT NULL DEFAULT 0, -- Total ever transferred in cents
  last_earned_at TIMESTAMPTZ, -- Last time mileage was earned
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_gas_money_driver_id ON driver_gas_money(driver_id);

-- Create gas_money_transactions table for tracking transfers
CREATE TABLE IF NOT EXISTS gas_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to order if earned from delivery
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('accumulate', 'transfer', 'adjustment', 'earned')),
  destination TEXT, -- 'feeder_card', 'bank', etc.
  description TEXT, -- Description of the transaction
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gas_money_transactions_driver_id ON gas_money_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_gas_money_transactions_created_at ON gas_money_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE driver_gas_money ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_money_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_gas_money
DROP POLICY IF EXISTS "Drivers can view their own gas money" ON driver_gas_money;
CREATE POLICY "Drivers can view their own gas money"
  ON driver_gas_money
  FOR SELECT
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update their own gas money" ON driver_gas_money;
CREATE POLICY "Drivers can update their own gas money"
  ON driver_gas_money
  FOR UPDATE
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "System can insert gas money records" ON driver_gas_money;
CREATE POLICY "System can insert gas money records"
  ON driver_gas_money
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for gas_money_transactions
DROP POLICY IF EXISTS "Drivers can view their own gas money transactions" ON gas_money_transactions;
CREATE POLICY "Drivers can view their own gas money transactions"
  ON gas_money_transactions
  FOR SELECT
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "System can insert gas money transactions" ON gas_money_transactions;
CREATE POLICY "System can insert gas money transactions"
  ON gas_money_transactions
  FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gas_money_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_driver_gas_money_updated_at ON driver_gas_money;
CREATE TRIGGER update_driver_gas_money_updated_at
  BEFORE UPDATE ON driver_gas_money
  FOR EACH ROW
  EXECUTE FUNCTION update_gas_money_updated_at();

-- Function to accumulate gas money from distance pay
CREATE OR REPLACE FUNCTION accumulate_gas_money(
  p_driver_id UUID,
  p_amount_cents INTEGER
)
RETURNS void AS $$
BEGIN
  -- Insert or update driver gas money balance
  INSERT INTO driver_gas_money (driver_id, balance, total_accumulated)
  VALUES (p_driver_id, p_amount_cents, p_amount_cents)
  ON CONFLICT (driver_id)
  DO UPDATE SET
    balance = driver_gas_money.balance + p_amount_cents,
    total_accumulated = driver_gas_money.total_accumulated + p_amount_cents,
    updated_at = NOW();
    
  -- Record transaction
  INSERT INTO gas_money_transactions (driver_id, amount_cents, transaction_type, status)
  VALUES (p_driver_id, p_amount_cents, 'accumulate', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accumulate_gas_money TO authenticated;

COMMENT ON TABLE driver_gas_money IS 'Tracks accumulated mileage earnings (gas money) for drivers';
COMMENT ON TABLE gas_money_transactions IS 'Records all gas money accumulation and transfer transactions';
COMMENT ON FUNCTION accumulate_gas_money IS 'Accumulates gas money from distance pay for a driver';

-- ========================================
-- STEP 2: Add Mileage Pay to Orders Table
-- ========================================

-- Add mileage_pay_cents column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mileage_pay_cents INTEGER DEFAULT 0;

-- Add index for querying orders with mileage pay
CREATE INDEX IF NOT EXISTS idx_orders_mileage_pay
ON orders(mileage_pay_cents)
WHERE mileage_pay_cents > 0;

-- Comment for documentation
COMMENT ON COLUMN orders.mileage_pay_cents IS 'Mileage reimbursement payment to driver in cents (based on IRS standard rate of $0.67/mile)';

-- ========================================
-- STEP 3: Create Triggers to Auto-Accumulate
-- ========================================

-- Create or replace function to accumulate mileage pay when order is delivered
CREATE OR REPLACE FUNCTION accumulate_mileage_pay_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only accumulate when order transitions TO delivered status
  IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
    -- Only process if there's a driver and mileage pay
    IF NEW.driver_id IS NOT NULL AND NEW.mileage_pay_cents > 0 THEN
      -- Insert or update driver_gas_money balance
      INSERT INTO driver_gas_money (driver_id, balance, last_earned_at, updated_at)
      VALUES (
        NEW.driver_id, 
        NEW.mileage_pay_cents,
        NOW(),
        NOW()
      )
      ON CONFLICT (driver_id)
      DO UPDATE SET 
        balance = driver_gas_money.balance + NEW.mileage_pay_cents,
        last_earned_at = NOW(),
        updated_at = NOW();
      
      -- Log the transaction for tracking
      INSERT INTO gas_money_transactions (
        driver_id,
        order_id,
        amount_cents,
        transaction_type,
        description,
        created_at
      )
      VALUES (
        NEW.driver_id,
        NEW.id,
        NEW.mileage_pay_cents,
        'earned',
        'Mileage pay from delivery',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_accumulate_mileage_pay ON orders;

-- Create trigger on orders table
CREATE TRIGGER trigger_accumulate_mileage_pay
  AFTER UPDATE OF order_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION accumulate_mileage_pay_on_delivery();

-- Also handle INSERT in case orders are created with 'delivered' status (like some test scenarios)
CREATE OR REPLACE FUNCTION accumulate_mileage_pay_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_status = 'delivered' AND NEW.driver_id IS NOT NULL AND NEW.mileage_pay_cents > 0 THEN
    INSERT INTO driver_gas_money (driver_id, balance, last_earned_at, updated_at)
    VALUES (
      NEW.driver_id, 
      NEW.mileage_pay_cents,
      NOW(),
      NOW()
    )
    ON CONFLICT (driver_id)
    DO UPDATE SET 
      balance = driver_gas_money.balance + NEW.mileage_pay_cents,
      last_earned_at = NOW(),
      updated_at = NOW();
    
    INSERT INTO gas_money_transactions (
      driver_id,
      order_id,
      amount_cents,
      transaction_type,
      description,
      created_at
    )
    VALUES (
      NEW.driver_id,
      NEW.id,
      NEW.mileage_pay_cents,
      'earned',
      'Mileage pay from delivery',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_accumulate_mileage_pay_on_insert ON orders;

CREATE TRIGGER trigger_accumulate_mileage_pay_on_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION accumulate_mileage_pay_on_insert();

-- Add comment for documentation
COMMENT ON FUNCTION accumulate_mileage_pay_on_delivery() IS 'Automatically accumulates mileage pay to driver_gas_money when order status changes to delivered';
COMMENT ON FUNCTION accumulate_mileage_pay_on_insert() IS 'Automatically accumulates mileage pay to driver_gas_money when order is created with delivered status';

-- ========================================
-- VERIFICATION QUERIES (Optional - Run these to verify)
-- ========================================

-- Check if driver_gas_money table exists and has correct columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'driver_gas_money';

-- Check if orders.mileage_pay_cents column exists
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mileage_pay_cents';

-- Check if triggers are created
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'orders';

-- ========================================
-- DONE! ✅
-- ========================================
-- Now your database is ready for Gas Money!
-- Test orders will automatically accumulate mileage pay.

