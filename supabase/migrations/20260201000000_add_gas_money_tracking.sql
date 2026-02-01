-- Create driver_gas_money table for tracking accumulated mileage earnings
CREATE TABLE IF NOT EXISTS driver_gas_money (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0, -- Balance in cents
  total_accumulated INTEGER NOT NULL DEFAULT 0, -- Total ever accumulated in cents
  total_transferred INTEGER NOT NULL DEFAULT 0, -- Total ever transferred in cents
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
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('accumulate', 'transfer', 'adjustment')),
  destination TEXT, -- 'feeder_card', 'bank', etc.
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
CREATE POLICY "Drivers can view their own gas money"
  ON driver_gas_money
  FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own gas money"
  ON driver_gas_money
  FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "System can insert gas money records"
  ON driver_gas_money
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for gas_money_transactions
CREATE POLICY "Drivers can view their own gas money transactions"
  ON gas_money_transactions
  FOR SELECT
  USING (auth.uid() = driver_id);

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

