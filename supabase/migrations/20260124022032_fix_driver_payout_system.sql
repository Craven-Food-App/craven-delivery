-- Migration: Fix Driver Payout System
-- Changes driver pay from subtotal-based to delivery-fee-based with base pay floor
-- Date: 2026-01-24

-- ============================================================================
-- PART A: Update driver_payout_settings table
-- ============================================================================

-- Add new fields to driver_payout_settings
ALTER TABLE public.driver_payout_settings
ADD COLUMN IF NOT EXISTS driver_base_pay_cents INTEGER NOT NULL DEFAULT 250,
ADD COLUMN IF NOT EXISTS driver_delivery_fee_share_bps INTEGER NOT NULL DEFAULT 7000,
ADD COLUMN IF NOT EXISTS tips_pass_through BOOLEAN NOT NULL DEFAULT true;

-- Update existing active setting to have correct defaults
UPDATE public.driver_payout_settings
SET 
  driver_base_pay_cents = 250,
  driver_delivery_fee_share_bps = 7000,
  tips_pass_through = true
WHERE is_active = true
  AND (driver_base_pay_cents IS NULL OR driver_delivery_fee_share_bps IS NULL OR tips_pass_through IS NULL);

-- Add comment to deprecate old percentage field (keep for now but don't use)
COMMENT ON COLUMN public.driver_payout_settings.percentage IS 'DEPRECATED: Use driver_delivery_fee_share_bps instead. This field remains for backward compatibility but should not be used for new calculations.';

-- ============================================================================
-- PART B: Add order snapshot payout fields to orders table
-- ============================================================================

-- Add snapshot fields to orders table (store payout inputs at order creation)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_fees_total_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_cents INTEGER NOT NULL DEFAULT 0, -- Already exists, but ensure it's there
ADD COLUMN IF NOT EXISTS driver_base_pay_cents INTEGER NOT NULL DEFAULT 250,
ADD COLUMN IF NOT EXISTS driver_delivery_fee_share_bps INTEGER NOT NULL DEFAULT 7000,
ADD COLUMN IF NOT EXISTS driver_payout_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_delivery_share_cents INTEGER NOT NULL DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.orders.delivery_fees_total_cents IS 'Total delivery fees charged to customer (snapshot at order creation)';
COMMENT ON COLUMN public.orders.driver_base_pay_cents IS 'Base pay minimum guarantee (snapshot at order creation)';
COMMENT ON COLUMN public.orders.driver_delivery_fee_share_bps IS 'Driver share of delivery fees in basis points (snapshot at order creation)';
COMMENT ON COLUMN public.orders.driver_payout_cents IS 'Total driver payout (base pay + tip, calculated at order creation)';
COMMENT ON COLUMN public.orders.platform_delivery_share_cents IS 'Platform share of delivery fees (snapshot at order creation)';

-- ============================================================================
-- PART C: Create SQL function for driver payout calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_driver_payout_cents(
  p_delivery_fees_total_cents INTEGER,
  p_tip_cents INTEGER,
  p_base_pay_cents INTEGER DEFAULT 250,
  p_share_bps INTEGER DEFAULT 7000
)
RETURNS TABLE (
  driver_payout_cents INTEGER,
  platform_delivery_share_cents INTEGER,
  driver_before_tip_cents INTEGER,
  driver_fee_share_cents INTEGER
) AS $$
DECLARE
  v_driver_fee_share_cents INTEGER;
  v_driver_before_tip_cents INTEGER;
  v_driver_payout_cents INTEGER;
  v_platform_delivery_share_cents INTEGER;
BEGIN
  -- Calculate driver's share of delivery fees
  v_driver_fee_share_cents := FLOOR(p_delivery_fees_total_cents * p_share_bps / 10000);
  
  -- Base pay is a floor, not additive
  -- driver_payout_before_tip = max(base_pay, delivery_fees_total * driver_share_pct)
  v_driver_before_tip_cents := GREATEST(p_base_pay_cents, v_driver_fee_share_cents);
  
  -- Total driver payout = before_tip + tip (100% of tip)
  v_driver_payout_cents := v_driver_before_tip_cents + p_tip_cents;
  
  -- Platform keeps remaining delivery fees
  -- platform_delivery_share = delivery_fees_total - (delivery_fees_total * driver_share_pct)
  v_platform_delivery_share_cents := p_delivery_fees_total_cents - v_driver_fee_share_cents;
  
  RETURN QUERY SELECT
    v_driver_payout_cents,
    v_platform_delivery_share_cents,
    v_driver_before_tip_cents,
    v_driver_fee_share_cents;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ensure function signature matches (already correct, but adding comment for clarity)
COMMENT ON FUNCTION public.calculate_driver_payout_cents IS 'Calculate driver payout based on delivery fees (not subtotal). Base pay is a floor, not additive. Returns driver_payout_cents, platform_delivery_share_cents, driver_before_tip_cents, and driver_fee_share_cents.';

-- Add comment
COMMENT ON FUNCTION public.calculate_driver_payout_cents IS 'Calculate driver payout based on delivery fees (not subtotal). Base pay is a floor, not additive. Returns driver_payout_cents, platform_delivery_share_cents, driver_before_tip_cents, and driver_fee_share_cents.';

-- ============================================================================
-- PART D: Backfill existing orders (if delivery_fees_total_cents is missing)
-- ============================================================================

-- For existing orders, try to backfill delivery_fees_total_cents from delivery_fee_cents
-- This is safe because delivery_fee_cents should contain the total delivery fees
UPDATE public.orders
SET 
  delivery_fees_total_cents = COALESCE(delivery_fee_cents, 0),
  driver_base_pay_cents = 250,
  driver_delivery_fee_share_bps = 7000
WHERE delivery_fees_total_cents = 0
  AND delivery_fee_cents IS NOT NULL
  AND delivery_fee_cents > 0;

-- Calculate and update payout fields for existing orders that have delivery_fees_total_cents
UPDATE public.orders o
SET 
  driver_payout_cents = calculated.driver_payout_cents,
  platform_delivery_share_cents = calculated.platform_delivery_share_cents
FROM (
  SELECT 
    o2.id,
    (payout.driver_payout_cents)::INTEGER as driver_payout_cents,
    (payout.platform_delivery_share_cents)::INTEGER as platform_delivery_share_cents
  FROM public.orders o2
  CROSS JOIN LATERAL public.calculate_driver_payout_cents(
    COALESCE(o2.delivery_fees_total_cents, 0),
    COALESCE(o2.tip_cents, 0),
    COALESCE(o2.driver_base_pay_cents, 250),
    COALESCE(o2.driver_delivery_fee_share_bps, 7000)
  ) AS payout
  WHERE o2.delivery_fees_total_cents > 0
    AND (o2.driver_payout_cents = 0 OR o2.driver_payout_cents IS NULL)
) AS calculated
WHERE o.id = calculated.id;

