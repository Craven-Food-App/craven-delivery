-- ========================================================================
-- STRIPE MARKETPLACE REFACTOR (DoorDash Style)
-- Platform is merchant of record. Connected accounts receive transfers only.
-- ========================================================================

-- 1. UNIFIED STRIPE ACCOUNTS TABLE
-- Tracks all Stripe Connect accounts (restaurants + drivers)
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('restaurant', 'driver')),
  owner_id UUID NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  details_submitted BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one Stripe account per owner
  UNIQUE(owner_type, owner_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS stripe_accounts_owner_idx 
ON public.stripe_accounts(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS stripe_accounts_stripe_id_idx 
ON public.stripe_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS stripe_accounts_payouts_enabled_idx 
ON public.stripe_accounts(payouts_enabled) 
WHERE payouts_enabled = TRUE;

-- RLS: Admin only
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_accounts_admin_access" ON public.stripe_accounts
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- 2. UPDATE ORDERS TABLE
-- Add columns for marketplace payment tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS amount_total_cents INTEGER,
ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS restaurant_net_cents INTEGER,
ADD COLUMN IF NOT EXISTS driver_pay_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_transfer_restaurant_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_transfer_driver_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS transfers_status TEXT DEFAULT 'not_started' 
  CHECK (transfers_status IN ('not_started', 'partial', 'complete', 'failed')),
ADD COLUMN IF NOT EXISTS transfers_error TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded'));

-- Indexes for payment tracking
CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_idx 
ON public.orders(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS orders_transfers_status_idx 
ON public.orders(transfers_status);

CREATE INDEX IF NOT EXISTS orders_payment_status_idx 
ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS orders_paid_at_idx 
ON public.orders(paid_at DESC);

-- Partial index for failed transfers (admin queue)
CREATE INDEX IF NOT EXISTS orders_transfers_failed_idx 
ON public.orders(id) 
WHERE transfers_status = 'failed';

-- 3. STRIPE WEBHOOK EVENTS TABLE (dedupe)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'received' 
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error TEXT,
  raw_data JSONB
);

-- Indexes for webhook processing
CREATE INDEX IF NOT EXISTS stripe_events_type_idx 
ON public.stripe_events(type);

CREATE INDEX IF NOT EXISTS stripe_events_status_idx 
ON public.stripe_events(status);

CREATE INDEX IF NOT EXISTS stripe_events_created_idx 
ON public.stripe_events(created DESC);

-- RLS: Admin only
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_admin_access" ON public.stripe_events
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- 4. LEDGER ENTRIES TABLE (source of truth for all money movement)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'customer_charge',
    'platform_fee',
    'restaurant_net',
    'driver_pay',
    'tip',
    'refund',
    'dispute_debit',
    'dispute_credit',
    'adjustment'
  )),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('platform', 'restaurant', 'driver')),
  owner_id UUID,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_object_id TEXT,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicate ledger entries
  UNIQUE(order_id, entry_type, owner_type, owner_id)
);

-- Indexes for ledger queries
CREATE INDEX IF NOT EXISTS ledger_entries_order_idx 
ON public.ledger_entries(order_id);

CREATE INDEX IF NOT EXISTS ledger_entries_owner_idx 
ON public.ledger_entries(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS ledger_entries_type_idx 
ON public.ledger_entries(entry_type);

CREATE INDEX IF NOT EXISTS ledger_entries_created_idx 
ON public.ledger_entries(created_at DESC);

-- RLS: Admin + owner can view their own entries
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_entries_admin_access" ON public.ledger_entries
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

CREATE POLICY "ledger_entries_owner_read" ON public.ledger_entries
  FOR SELECT
  USING (
    (owner_type = 'restaurant' AND owner_id = auth.uid())
    OR (owner_type = 'driver' AND owner_id = auth.uid())
  );

-- 5. HELPER VIEWS

-- Orders needing attention (admin queue)
CREATE OR REPLACE VIEW public.orders_needs_attention AS
SELECT 
  o.*,
  CASE
    WHEN o.transfers_status = 'failed' THEN 'Transfer Failed'
    WHEN o.payment_status = 'failed' THEN 'Payment Failed'
    ELSE 'Unknown'
  END as attention_reason
FROM public.orders o
WHERE o.transfers_status = 'failed' 
   OR o.payment_status = 'failed';

GRANT SELECT ON public.orders_needs_attention TO authenticated;

-- Connected accounts summary
CREATE OR REPLACE VIEW public.stripe_accounts_summary AS
SELECT 
  sa.id,
  sa.owner_type,
  sa.owner_id,
  sa.stripe_account_id,
  sa.details_submitted,
  sa.payouts_enabled,
  sa.charges_enabled,
  sa.requirements,
  CASE 
    WHEN sa.owner_type = 'restaurant' THEN r.name
    WHEN sa.owner_type = 'driver' THEN dp.user_id::TEXT
    ELSE NULL
  END as owner_name,
  sa.created_at,
  sa.updated_at
FROM public.stripe_accounts sa
LEFT JOIN public.restaurants r ON sa.owner_type = 'restaurant' AND sa.owner_id = r.id
LEFT JOIN public.driver_profiles dp ON sa.owner_type = 'driver' AND sa.owner_id = dp.user_id;

GRANT SELECT ON public.stripe_accounts_summary TO authenticated;

-- 6. FUNCTIONS

-- Calculate split for an order (15% platform fee)
CREATE OR REPLACE FUNCTION public.calculate_order_splits(
  p_subtotal_cents INTEGER,
  p_tax_cents INTEGER,
  p_delivery_fee_cents INTEGER,
  p_tip_cents INTEGER
)
RETURNS TABLE (
  amount_total_cents INTEGER,
  platform_fee_cents INTEGER,
  restaurant_net_cents INTEGER,
  driver_pay_cents INTEGER
) AS $$
DECLARE
  v_total INTEGER;
  v_platform_fee INTEGER;
  v_restaurant_net INTEGER;
  v_driver_pay INTEGER;
BEGIN
  v_total := p_subtotal_cents + p_tax_cents + p_delivery_fee_cents + p_tip_cents;
  v_platform_fee := ROUND(p_subtotal_cents * 0.15); -- 15% platform fee
  v_restaurant_net := p_subtotal_cents - v_platform_fee;
  v_driver_pay := p_delivery_fee_cents; -- Driver gets delivery fee (tip added separately)
  
  RETURN QUERY SELECT v_total, v_platform_fee, v_restaurant_net, v_driver_pay;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments
COMMENT ON TABLE public.stripe_accounts IS 'Unified Stripe Connect accounts for restaurants and drivers (Custom accounts, transfers only)';
COMMENT ON TABLE public.stripe_events IS 'Webhook event deduplication and processing status';
COMMENT ON TABLE public.ledger_entries IS 'Immutable source of truth for all money movement in the platform';
COMMENT ON VIEW public.orders_needs_attention IS 'Admin queue for orders with failed payments or transfers';

