-- Add mileage_pay_cents column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mileage_pay_cents INTEGER DEFAULT 0;

-- Add index for querying orders with mileage pay
CREATE INDEX IF NOT EXISTS idx_orders_mileage_pay
ON orders(mileage_pay_cents)
WHERE mileage_pay_cents > 0;

-- Comment for documentation
COMMENT ON COLUMN orders.mileage_pay_cents IS 'Mileage reimbursement payment to driver in cents (based on IRS standard rate of $0.67/mile)';

