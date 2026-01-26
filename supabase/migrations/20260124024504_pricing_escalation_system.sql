-- Migration: Pricing + Dispatch + Escalation System
-- Implements complete pricing structure with wait-time escalation
-- Date: 2026-01-24

-- ============================================================================
-- PART A: Add merchant commission to payout settings
-- ============================================================================

ALTER TABLE public.driver_payout_settings
ADD COLUMN IF NOT EXISTS merchant_commission_bps INTEGER NOT NULL DEFAULT 1500;

COMMENT ON COLUMN public.driver_payout_settings.merchant_commission_bps IS 'Merchant commission in basis points (1500 = 15% of food subtotal)';

-- Update existing active setting
UPDATE public.driver_payout_settings
SET merchant_commission_bps = 1500
WHERE is_active = true
  AND merchant_commission_bps IS NULL;

-- ============================================================================
-- PART B: Add fee component fields to orders table
-- ============================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS food_subtotal_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_fee_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_fee_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS demand_fee_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalation_fee_cents INTEGER NOT NULL DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.orders.food_subtotal_cents IS 'Food subtotal before tax and fees (snapshot at order creation)';
COMMENT ON COLUMN public.orders.base_delivery_fee_cents IS 'Base delivery fee component';
COMMENT ON COLUMN public.orders.distance_fee_cents IS 'Distance-based fee component';
COMMENT ON COLUMN public.orders.time_fee_cents IS 'Time-based fee component';
COMMENT ON COLUMN public.orders.demand_fee_cents IS 'Demand/surge fee component';
COMMENT ON COLUMN public.orders.escalation_fee_cents IS 'Wait-time escalation fee (increases while broadcasting)';

-- ============================================================================
-- PART C: Add merchant settlement snapshot fields
-- ============================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS merchant_commission_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS merchant_payout_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_food_commission_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.merchant_commission_cents IS 'Merchant commission (15% of food subtotal, snapshot at order creation)';
COMMENT ON COLUMN public.orders.merchant_payout_cents IS 'Merchant payout (food_subtotal - commission, snapshot at order creation)';
COMMENT ON COLUMN public.orders.platform_food_commission_cents IS 'Platform commission from food (15% of food subtotal, snapshot at order creation)';

-- ============================================================================
-- PART D: Add additional driver settlement fields
-- ============================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS driver_fee_share_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.driver_fee_share_cents IS 'Driver share of delivery fees (before base pay floor, snapshot at order creation)';

-- ============================================================================
-- PART E: Add dispatch and escalation fields
-- ============================================================================

-- Update order_status to include 'broadcasting' and 'accepted'
-- First, check if constraint exists and update it
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
  
  -- Add new constraint with all statuses
  ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check 
    CHECK (order_status IN ('created', 'broadcasting', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'pending', 'confirmed', 'preparing', 'ready'));
END $$;

-- Add dispatch/escalation fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS broadcast_started_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS accepted_driver_id UUID NULL REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS next_escalation_step INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_escalation_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS auto_boost_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_boost_cap_cents INTEGER NOT NULL DEFAULT 600,
ADD COLUMN IF NOT EXISTS escalated_total_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_boost_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.orders.broadcast_started_at IS 'When order started broadcasting to drivers';
COMMENT ON COLUMN public.orders.accepted_driver_id IS 'Driver who accepted the order (locks escalation)';
COMMENT ON COLUMN public.orders.accepted_at IS 'When order was accepted by driver';
COMMENT ON COLUMN public.orders.next_escalation_step IS 'Next escalation step (0=+2min, 1=+5min, 2=+8min)';
COMMENT ON COLUMN public.orders.next_escalation_at IS 'When next escalation should occur';
COMMENT ON COLUMN public.orders.auto_boost_enabled IS 'Whether customer enabled auto-escalation';
COMMENT ON COLUMN public.orders.auto_boost_cap_cents IS 'Maximum escalation amount customer approved';
COMMENT ON COLUMN public.orders.escalated_total_cents IS 'Total escalation applied so far';
COMMENT ON COLUMN public.orders.customer_boost_required IS 'Whether customer needs to manually approve boost';

-- Set default status to 'broadcasting' for new orders
ALTER TABLE public.orders ALTER COLUMN order_status SET DEFAULT 'broadcasting';

-- ============================================================================
-- PART F: Create SQL functions for pricing calculations
-- ============================================================================

-- Function: Compute total delivery fees from components
CREATE OR REPLACE FUNCTION public.compute_delivery_fees_total_cents(
  p_base_delivery_fee_cents INTEGER,
  p_distance_fee_cents INTEGER,
  p_time_fee_cents INTEGER,
  p_demand_fee_cents INTEGER,
  p_escalation_fee_cents INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(p_base_delivery_fee_cents, 0) +
         COALESCE(p_distance_fee_cents, 0) +
         COALESCE(p_time_fee_cents, 0) +
         COALESCE(p_demand_fee_cents, 0) +
         COALESCE(p_escalation_fee_cents, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.compute_delivery_fees_total_cents IS 'Compute total delivery fees from component fees';

-- Function: Calculate merchant payout
CREATE OR REPLACE FUNCTION public.calculate_merchant_payout_cents(
  p_food_subtotal_cents INTEGER,
  p_merchant_commission_bps INTEGER DEFAULT 1500
)
RETURNS TABLE (
  merchant_commission_cents INTEGER,
  merchant_payout_cents INTEGER,
  platform_food_commission_cents INTEGER
) AS $$
DECLARE
  v_merchant_commission_cents INTEGER;
  v_merchant_payout_cents INTEGER;
BEGIN
  -- Merchant commission = 15% of food subtotal
  v_merchant_commission_cents := FLOOR(p_food_subtotal_cents * p_merchant_commission_bps / 10000);
  
  -- Merchant payout = food_subtotal - commission
  v_merchant_payout_cents := p_food_subtotal_cents - v_merchant_commission_cents;
  
  RETURN QUERY SELECT
    v_merchant_commission_cents,
    v_merchant_payout_cents,
    v_merchant_commission_cents; -- Platform commission equals merchant commission
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_merchant_payout_cents IS 'Calculate merchant commission and payout. Merchant gets 85% of food subtotal, platform gets 15%.';

-- ============================================================================
-- PART G: Create index for escalation processing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_escalation_processing
ON public.orders (order_status, next_escalation_at, accepted_driver_id)
WHERE order_status = 'broadcasting' 
  AND accepted_driver_id IS NULL 
  AND next_escalation_at IS NOT NULL;

-- ============================================================================
-- PART H: Backfill existing orders
-- ============================================================================

-- Set food_subtotal_cents from subtotal_cents if missing
UPDATE public.orders
SET food_subtotal_cents = COALESCE(subtotal_cents, 0)
WHERE food_subtotal_cents = 0
  AND subtotal_cents IS NOT NULL;

-- Set delivery_fees_total_cents from delivery_fee_cents if missing
UPDATE public.orders
SET delivery_fees_total_cents = COALESCE(delivery_fee_cents, 0),
    base_delivery_fee_cents = COALESCE(delivery_fee_cents, 0)
WHERE delivery_fees_total_cents = 0
  AND delivery_fee_cents IS NOT NULL
  AND delivery_fee_cents > 0;

-- Calculate merchant payouts for existing orders
UPDATE public.orders o
SET 
  merchant_commission_cents = calculated.merchant_commission_cents,
  merchant_payout_cents = calculated.merchant_payout_cents,
  platform_food_commission_cents = calculated.platform_food_commission_cents
FROM (
  SELECT 
    id,
    (merchant.merchant_commission_cents)::INTEGER as merchant_commission_cents,
    (merchant.merchant_payout_cents)::INTEGER as merchant_payout_cents,
    (merchant.platform_food_commission_cents)::INTEGER as platform_food_commission_cents
  FROM public.orders
  CROSS JOIN LATERAL public.calculate_merchant_payout_cents(
    COALESCE(food_subtotal_cents, subtotal_cents, 0),
    1500
  ) AS merchant
  WHERE food_subtotal_cents > 0 OR subtotal_cents > 0
    AND (public.orders.merchant_commission_cents = 0 OR public.orders.merchant_commission_cents IS NULL)
) AS calculated
WHERE o.id = calculated.id;

