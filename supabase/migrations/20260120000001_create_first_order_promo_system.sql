-- Promo #1: "$20 Crave'n Credit — Unlock Over First 3 Orders"
-- Migration: Create promo tables, add order columns, indexes, constraints

-- ============================================================================
-- A1) PROMOTIONS DEFINITION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the first order promo
INSERT INTO public.promotions (code, name, is_active, rules)
VALUES (
  'CREDIT_20_FIRST3',
  '$20 Crave''n Credit — Unlock Over First 3 Orders',
  true,
  jsonb_build_object(
    'min_subtotal_cents', 1500,
    'expiry_days', 14,
    'delivery_cap_cents', 300,
    'steps', jsonb_build_array(
      jsonb_build_object('step', 1, 'credit_cents', 800),
      jsonb_build_object('step', 2, 'credit_cents', 700),
      jsonb_build_object('step', 3, 'credit_cents', 500)
    ),
    'max_total_credit_cents', 2000
  )
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- A2) PROMO WALLETS TABLE (per-user enrollment state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promo_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, promotion_id)
);

-- ============================================================================
-- A3) PROMO LEDGER TABLE (audit trail for unlocks/redemptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promo_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 3),
  event_type TEXT NOT NULL CHECK (event_type IN ('UNLOCKED', 'RESERVED', 'REDEEMED', 'REVOKED')),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  credit_cents INTEGER NOT NULL CHECK (credit_cents >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Unique constraint: only one REDEEMED per user per step
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_ledger_redeemed_unique
ON public.promo_ledger(user_id, promotion_id, step)
WHERE event_type = 'REDEEMED';

-- Unique constraint: only one RESERVED per user per step at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_ledger_reserved_unique
ON public.promo_ledger(user_id, promotion_id, step)
WHERE event_type = 'RESERVED';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_ledger_user_promo
ON public.promo_ledger(user_id, promotion_id, step);

CREATE INDEX IF NOT EXISTS idx_promo_ledger_order
ON public.promo_ledger(order_id)
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promo_ledger_created_at
ON public.promo_ledger(created_at);

CREATE INDEX IF NOT EXISTS idx_promo_wallets_user
ON public.promo_wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_promo_wallets_expires
ON public.promo_wallets(expires_at);

-- ============================================================================
-- A4) ADD PROMO COLUMNS TO ORDERS TABLE
-- ============================================================================
DO $$
BEGIN
  -- Add promo tracking columns to orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_id UUID REFERENCES public.promotions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_step'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_step INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_delivery_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_delivery_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_service_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_service_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_applied'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_applied BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'promo_applied_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN promo_applied_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Ensure required monetary columns exist (add if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'food_subtotal_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN food_subtotal_cents INTEGER;
    -- Backfill from subtotal_cents if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'subtotal_cents'
    ) THEN
      UPDATE public.orders 
      SET food_subtotal_cents = subtotal_cents 
      WHERE food_subtotal_cents IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'service_fee_cents'
  ) THEN
    -- Use processing_fee_cents as service_fee_cents if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'processing_fee_cents'
    ) THEN
      ALTER TABLE public.orders ADD COLUMN service_fee_cents INTEGER;
      UPDATE public.orders 
      SET service_fee_cents = processing_fee_cents 
      WHERE service_fee_cents IS NULL AND processing_fee_cents IS NOT NULL;
    ELSE
      ALTER TABLE public.orders ADD COLUMN service_fee_cents INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Indexes for promo columns on orders
CREATE INDEX IF NOT EXISTS idx_orders_promo_id
ON public.orders(promo_id)
WHERE promo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_promo_applied
ON public.orders(promo_applied, customer_id)
WHERE promo_applied = true;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.promotions IS 'Promotion definitions and configuration';
COMMENT ON TABLE public.promo_wallets IS 'Per-user enrollment state for promotions';
COMMENT ON TABLE public.promo_ledger IS 'Audit trail for promo unlocks, reservations, and redemptions';
COMMENT ON COLUMN public.orders.promo_id IS 'Promotion applied to this order';
COMMENT ON COLUMN public.orders.promo_step IS 'Step number (1-3) of the promo used';
COMMENT ON COLUMN public.orders.promo_credit_applied_cents IS 'Total credit applied (delivery + service)';
COMMENT ON COLUMN public.orders.promo_delivery_credit_applied_cents IS 'Credit applied to delivery fee';
COMMENT ON COLUMN public.orders.promo_service_credit_applied_cents IS 'Credit applied to service/processing fee';
COMMENT ON COLUMN public.orders.promo_applied IS 'Whether promo was successfully applied';
COMMENT ON COLUMN public.orders.promo_applied_at IS 'Timestamp when promo was applied';












