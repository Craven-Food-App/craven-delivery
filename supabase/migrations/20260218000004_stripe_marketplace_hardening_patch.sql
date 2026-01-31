-- ========================================================================
-- HARDENING PATCH: event dedupe, leases, append-only refunds, RLS WITH CHECK,
-- robust enum detection, persist stripe_payment_intent_id, service_role RPC
-- ========================================================================

-- 1) Ensure stripe_events table exists (without raw_data), then create unique index on event_id
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'received' 
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error TEXT
);

-- Create unique index on event_id (required for insert-first dedupe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'stripe_events_event_id_key'
  ) THEN
    CREATE UNIQUE INDEX stripe_events_event_id_key
      ON public.stripe_events(event_id);
  END IF;
END $$;

-- 2) Ensure orders table has all required marketplace columns, then add lease columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS amount_total_cents INTEGER,
ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS restaurant_net_cents INTEGER,
ADD COLUMN IF NOT EXISTS driver_pay_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_restaurant_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_driver_id TEXT,
ADD COLUMN IF NOT EXISTS transfers_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS transfers_error TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transfers_lease_id TEXT,
ADD COLUMN IF NOT EXISTS transfers_lease_expires_at TIMESTAMPTZ;

-- Add CHECK constraint for transfers_status if column exists and constraint doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders' AND column_name='transfers_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.orders'::regclass
    AND conname='orders_transfers_status_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_transfers_status_check
    CHECK (transfers_status IN ('not_started', 'partial', 'complete', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public'
      AND c.relname='orders_lease_expires_idx'
  ) THEN
    CREATE INDEX orders_lease_expires_idx
      ON public.orders(transfers_lease_expires_at)
      WHERE transfers_lease_expires_at IS NOT NULL;
  END IF;
END $$;

-- 3) stripe_events metadata + drop raw_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stripe_events'
      AND column_name='metadata'
  ) THEN
    ALTER TABLE public.stripe_events
      ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

ALTER TABLE public.stripe_events DROP COLUMN IF EXISTS raw_data;

-- 4) payment_status: add partial_refund (enum OR check constraint)
DO $$
DECLARE
  v_is_enum BOOLEAN;
  v_constraint_name TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE n.nspname='public'
      AND c.relname='orders'
      AND a.attname='payment_status'
      AND t.typtype='e'
  ) INTO v_is_enum;

  IF v_is_enum THEN
    BEGIN
      ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partial_refund';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    SELECT con.conname INTO v_constraint_name
    FROM pg_constraint con
    WHERE con.conrelid = 'public.orders'::regclass
      AND con.contype = 'c'
      AND con.conname ILIKE '%payment_status%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    END IF;

    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending','succeeded','failed','refunded','partial_refund'));
  END IF;
END $$;

-- 5) Ensure ledger_entries table exists, then create append-only refunds uniqueness index
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
  
  -- Unique constraint to prevent duplicate ledger entries (non-refund)
  UNIQUE(order_id, entry_type, owner_type, owner_id)
);

-- Enable RLS on ledger_entries if not already enabled
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create useful indexes if they don't exist
CREATE INDEX IF NOT EXISTS ledger_entries_order_idx 
  ON public.ledger_entries(order_id);

CREATE INDEX IF NOT EXISTS ledger_entries_owner_idx 
  ON public.ledger_entries(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS ledger_entries_type_idx 
  ON public.ledger_entries(entry_type);

CREATE INDEX IF NOT EXISTS ledger_entries_created_idx 
  ON public.ledger_entries(created_at DESC);

-- Create append-only refunds uniqueness index (index existence via pg_class)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public'
      AND c.relname='ledger_entries_refund_unique'
  ) THEN
    CREATE UNIQUE INDEX ledger_entries_refund_unique
      ON public.ledger_entries(order_id, entry_type, stripe_object_id)
      WHERE entry_type='refund' AND stripe_object_id IS NOT NULL;
  END IF;
END $$;

-- 6) ledger RLS: USING + WITH CHECK
DROP POLICY IF EXISTS "ledger_entries_owner_read" ON public.ledger_entries;
DROP POLICY IF EXISTS "ledger_entries_admin_only" ON public.ledger_entries;

CREATE POLICY "ledger_entries_admin_only" ON public.ledger_entries
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin','ceo','super_admin')
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin','ceo','super_admin')
    )
  );

-- 7) RPC functions (lease + status_code + persist payment_intent_id)
DROP FUNCTION IF EXISTS public.lock_order_for_transfers(UUID, TEXT);
DROP FUNCTION IF EXISTS public.finalize_order_transfers(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mark_transfer_failed(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.lock_order_for_transfers(
  p_order_id UUID,
  p_stripe_payment_intent_id TEXT
)
RETURNS TABLE (
  order_id UUID,
  restaurant_id UUID,
  driver_id UUID,
  amount_total_cents INTEGER,
  platform_fee_cents INTEGER,
  restaurant_net_cents INTEGER,
  driver_pay_cents INTEGER,
  tip_cents INTEGER,
  currency TEXT,
  stripe_transfer_restaurant_id TEXT,
  stripe_transfer_driver_id TEXT,
  transfers_lease_id TEXT,
  status_code TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_total_check INTEGER;
  v_new_lease_id TEXT;
  v_fresh RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.transfers_status = 'complete' THEN
    RETURN QUERY
    SELECT
      v_order.id, v_order.restaurant_id, v_order.driver_id,
      v_order.amount_total_cents, v_order.platform_fee_cents,
      v_order.restaurant_net_cents, v_order.driver_pay_cents,
      v_order.tip_cents, COALESCE(v_order.currency,'usd')::TEXT,
      v_order.stripe_transfer_restaurant_id, v_order.stripe_transfer_driver_id,
      NULL::TEXT, 'complete'::TEXT;
    RETURN;
  END IF;

  IF v_order.transfers_status='partial'
     AND v_order.transfers_lease_expires_at IS NOT NULL
     AND v_order.transfers_lease_expires_at > now() THEN
    RETURN QUERY
    SELECT
      v_order.id, v_order.restaurant_id, v_order.driver_id,
      v_order.amount_total_cents, v_order.platform_fee_cents,
      v_order.restaurant_net_cents, v_order.driver_pay_cents,
      v_order.tip_cents, COALESCE(v_order.currency,'usd')::TEXT,
      v_order.stripe_transfer_restaurant_id, v_order.stripe_transfer_driver_id,
      v_order.transfers_lease_id, 'locked'::TEXT;
    RETURN;
  END IF;

  v_total_check := COALESCE(v_order.platform_fee_cents,0)
                + COALESCE(v_order.restaurant_net_cents,0)
                + COALESCE(v_order.driver_pay_cents,0)
                + COALESCE(v_order.tip_cents,0);

  IF v_total_check != v_order.amount_total_cents THEN
    RAISE EXCEPTION 'Split math invalid: % != %', v_total_check, v_order.amount_total_cents;
  END IF;

  v_new_lease_id := gen_random_uuid()::text;

  UPDATE public.orders
  SET
    transfers_status='partial',
    transfers_lease_id=v_new_lease_id,
    transfers_lease_expires_at=now() + interval '5 minutes',
    paid_at=COALESCE(paid_at, now()),
    payment_status='succeeded',
    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, p_stripe_payment_intent_id),
    updated_at=now()
  WHERE id=p_order_id;

  SELECT * INTO v_fresh FROM public.orders WHERE id=p_order_id;

  RETURN QUERY
  SELECT
    v_fresh.id, v_fresh.restaurant_id, v_fresh.driver_id,
    v_fresh.amount_total_cents, v_fresh.platform_fee_cents,
    v_fresh.restaurant_net_cents, v_fresh.driver_pay_cents,
    v_fresh.tip_cents, COALESCE(v_fresh.currency,'usd')::TEXT,
    v_fresh.stripe_transfer_restaurant_id, v_fresh.stripe_transfer_driver_id,
    v_fresh.transfers_lease_id, 'acquired'::TEXT;
END;
$$;

CREATE FUNCTION public.finalize_order_transfers(
  p_order_id UUID,
  p_transfers_lease_id TEXT,
  p_restaurant_transfer_id TEXT,
  p_driver_transfer_id TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path=public
LANGUAGE plpgsql
AS $$
DECLARE v_updated INTEGER;
BEGIN
  UPDATE public.orders
  SET
    stripe_transfer_restaurant_id = COALESCE(p_restaurant_transfer_id, stripe_transfer_restaurant_id),
    stripe_transfer_driver_id = COALESCE(p_driver_transfer_id, stripe_transfer_driver_id),
    transfers_status='complete',
    transfers_error=NULL,
    transfers_lease_id=NULL,
    transfers_lease_expires_at=NULL,
    updated_at=now()
  WHERE id=p_order_id
    AND transfers_lease_id=p_transfers_lease_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Lease validation failed for order %', p_order_id;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE FUNCTION public.mark_transfer_failed(
  p_order_id UUID,
  p_transfers_lease_id TEXT,
  p_error_message TEXT,
  p_restaurant_transfer_id TEXT DEFAULT NULL,
  p_driver_transfer_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path=public
LANGUAGE plpgsql
AS $$
DECLARE v_updated INTEGER;
BEGIN
  UPDATE public.orders
  SET
    stripe_transfer_restaurant_id = COALESCE(p_restaurant_transfer_id, stripe_transfer_restaurant_id),
    stripe_transfer_driver_id = COALESCE(p_driver_transfer_id, stripe_transfer_driver_id),
    transfers_status='failed',
    transfers_error=p_error_message,
    transfers_lease_id=NULL,
    transfers_lease_expires_at=NULL,
    updated_at=now()
  WHERE id=p_order_id
    AND transfers_lease_id=p_transfers_lease_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Lease validation failed for order %', p_order_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- service_role only
REVOKE ALL ON FUNCTION public.lock_order_for_transfers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_order_transfers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_transfer_failed FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.lock_order_for_transfers TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_transfers TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_transfer_failed TO service_role;

-- 8) orders_needs_attention
CREATE OR REPLACE VIEW public.orders_needs_attention AS
SELECT
  o.*,
  CASE
    WHEN o.transfers_status='failed' THEN 'Transfer Failed'
    WHEN o.payment_status='failed' THEN 'Payment Failed'
    WHEN o.payment_status='partial_refund' THEN 'Partial Refund'
    WHEN o.payment_status='refunded'
      AND (o.stripe_transfer_restaurant_id IS NOT NULL OR o.stripe_transfer_driver_id IS NOT NULL)
      THEN 'Refunded With Transfers'
    ELSE 'Unknown'
  END AS attention_reason
FROM public.orders o
WHERE o.transfers_status='failed'
   OR o.payment_status='failed'
   OR o.payment_status='partial_refund'
   OR (o.payment_status='refunded'
       AND (o.stripe_transfer_restaurant_id IS NOT NULL OR o.stripe_transfer_driver_id IS NOT NULL));

GRANT SELECT ON public.orders_needs_attention TO authenticated;

