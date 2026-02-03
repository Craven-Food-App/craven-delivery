-- ============================================================================
-- CRAVE'N WALLET + STRIPE ISSUING CARDS SYSTEM
-- Enables feeder card spends from driver earnings wallet
-- Production-safe: atomic reservations, idempotency, fail-closed
-- Date: 2026-02-03
-- ============================================================================

-- ============================================================================
-- PART A: DRIVER WALLET TABLE
-- Tracks available and reserved earnings balance for each driver
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_wallet (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_cents INTEGER NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  reserved_cents INTEGER NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_wallet_driver_id ON public.driver_wallet(driver_id);

COMMENT ON TABLE public.driver_wallet IS 'Driver earnings wallet with authorization holds for Issuing cards';
COMMENT ON COLUMN public.driver_wallet.available_cents IS 'Total available balance in cents (earnings not yet paid out)';
COMMENT ON COLUMN public.driver_wallet.reserved_cents IS 'Reserved balance for pending card authorizations';

-- ============================================================================
-- PART B: DRIVER CARDS TABLE
-- Maps Stripe Issuing cards to drivers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuing_card_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, issuing_card_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_cards_driver_id ON public.driver_cards(driver_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_cards_issuing_card_id ON public.driver_cards(issuing_card_id);

COMMENT ON TABLE public.driver_cards IS 'Maps Stripe Issuing cards to driver accounts';

-- ============================================================================
-- PART C: WALLET LEDGER TABLE
-- Append-only transaction log for all wallet operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'earnings_credit',
    'card_auth_hold',
    'card_auth_release',
    'card_clearing_debit',
    'adjustment',
    'payout_debit'
  )),
  amount_cents INTEGER NOT NULL,
  stripe_auth_id TEXT,
  stripe_txn_id TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_driver_id ON public.wallet_ledger(driver_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_stripe_auth_id ON public.wallet_ledger(stripe_auth_id) WHERE stripe_auth_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_stripe_txn_id ON public.wallet_ledger(stripe_txn_id) WHERE stripe_txn_id IS NOT NULL;

COMMENT ON TABLE public.wallet_ledger IS 'Append-only ledger of all wallet transactions';
COMMENT ON COLUMN public.wallet_ledger.type IS 'Transaction type: earnings_credit, card_auth_hold, card_auth_release, card_clearing_debit, adjustment, payout_debit';
COMMENT ON COLUMN public.wallet_ledger.amount_cents IS 'Amount in cents (positive = credit, negative = debit)';

-- ============================================================================
-- PART D: RLS POLICIES
-- ============================================================================

ALTER TABLE public.driver_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "drivers_can_view_own_wallet" ON public.driver_wallet;
DROP POLICY IF EXISTS "admin_full_access_wallet" ON public.driver_wallet;
DROP POLICY IF EXISTS "drivers_can_view_own_cards" ON public.driver_cards;
DROP POLICY IF EXISTS "admin_full_access_cards" ON public.driver_cards;
DROP POLICY IF EXISTS "drivers_can_view_own_ledger" ON public.wallet_ledger;
DROP POLICY IF EXISTS "admin_full_access_ledger" ON public.wallet_ledger;

-- Driver wallet: drivers can SELECT their own
CREATE POLICY "drivers_can_view_own_wallet" ON public.driver_wallet
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Admin access
CREATE POLICY "admin_full_access_wallet" ON public.driver_wallet
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Driver cards: drivers can SELECT their own
CREATE POLICY "drivers_can_view_own_cards" ON public.driver_cards
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Admin access
CREATE POLICY "admin_full_access_cards" ON public.driver_cards
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Wallet ledger: drivers can SELECT their own
CREATE POLICY "drivers_can_view_own_ledger" ON public.wallet_ledger
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Admin access
CREATE POLICY "admin_full_access_ledger" ON public.wallet_ledger
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- ============================================================================
-- PART E: RPC FUNCTION - reserve_wallet_for_card_auth
-- Atomically reserve funds for a card authorization request
-- Returns: true if approved, false if insufficient funds
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_wallet_for_card_auth(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_stripe_auth_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_spendable_cents INTEGER;
  v_already_reserved BOOLEAN;
BEGIN
  -- IDEMPOTENCY: Check if this auth_id already exists in ledger
  SELECT EXISTS(
    SELECT 1 FROM public.wallet_ledger
    WHERE stripe_auth_id = p_stripe_auth_id
    AND type = 'card_auth_hold'
  ) INTO v_already_reserved;

  IF v_already_reserved THEN
    -- Already processed, return true (approved)
    RETURN true;
  END IF;

  -- ATOMIC: Ensure wallet exists, then lock and check balance
  -- Use INSERT ... ON CONFLICT to handle race condition on wallet creation
  INSERT INTO public.driver_wallet (driver_id, available_cents, reserved_cents)
  VALUES (p_driver_id, 0, 0)
  ON CONFLICT (driver_id) DO NOTHING;

  -- Now lock and read the wallet row
  SELECT available_cents - reserved_cents INTO v_spendable_cents
  FROM public.driver_wallet
  WHERE driver_id = p_driver_id
  FOR UPDATE;

  -- If still not found (shouldn't happen, but fail-safe)
  IF v_spendable_cents IS NULL THEN
    v_spendable_cents := 0;
  END IF;

  -- Check if sufficient funds
  IF v_spendable_cents < p_amount_cents THEN
    RETURN false; -- DECLINE
  END IF;

  -- Reserve funds (atomic update on locked row)
  UPDATE public.driver_wallet
  SET 
    reserved_cents = reserved_cents + p_amount_cents,
    updated_at = now()
  WHERE driver_id = p_driver_id;

  -- Log to ledger
  INSERT INTO public.wallet_ledger (
    driver_id,
    type,
    amount_cents,
    stripe_auth_id,
    notes
  ) VALUES (
    p_driver_id,
    'card_auth_hold',
    -p_amount_cents,
    p_stripe_auth_id,
    'Card authorization hold'
  );

  RETURN true; -- APPROVE

EXCEPTION
  WHEN OTHERS THEN
    -- Any error = fail closed (decline)
    RAISE WARNING 'reserve_wallet_for_card_auth error: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reserve_wallet_for_card_auth TO service_role;

COMMENT ON FUNCTION public.reserve_wallet_for_card_auth IS 'Atomically reserve wallet funds for Stripe Issuing card authorization. Returns true (approve) or false (decline). Idempotent.';

-- ============================================================================
-- PART F: RPC FUNCTION - release_wallet_hold
-- Release a reserved authorization (reversal or expiration)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.release_wallet_hold(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_stripe_auth_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_already_released BOOLEAN;
BEGIN
  -- IDEMPOTENCY: Check if this auth_id already has a release entry
  SELECT EXISTS(
    SELECT 1 FROM public.wallet_ledger
    WHERE stripe_auth_id = p_stripe_auth_id
    AND type = 'card_auth_release'
  ) INTO v_already_released;

  IF v_already_released THEN
    -- Already released, do nothing
    RETURN;
  END IF;

  -- ATOMIC: Lock wallet row
  UPDATE public.driver_wallet
  SET 
    reserved_cents = GREATEST(reserved_cents - p_amount_cents, 0),
    updated_at = now()
  WHERE driver_id = p_driver_id;

  -- Log to ledger
  INSERT INTO public.wallet_ledger (
    driver_id,
    type,
    amount_cents,
    stripe_auth_id,
    notes
  ) VALUES (
    p_driver_id,
    'card_auth_release',
    p_amount_cents,
    p_stripe_auth_id,
    'Card authorization released'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'release_wallet_hold error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.release_wallet_hold TO service_role;

COMMENT ON FUNCTION public.release_wallet_hold IS 'Release reserved funds when authorization is reversed or expired. Idempotent.';

-- ============================================================================
-- PART G: RPC FUNCTION - finalize_wallet_clearing
-- Finalize card transaction clearing (convert hold to actual debit)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.finalize_wallet_clearing(
  p_driver_id UUID,
  p_held_amount_cents INTEGER,
  p_cleared_amount_cents INTEGER,
  p_stripe_auth_id TEXT,
  p_stripe_txn_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_already_cleared BOOLEAN;
BEGIN
  -- IDEMPOTENCY: Check if this txn_id already exists
  SELECT EXISTS(
    SELECT 1 FROM public.wallet_ledger
    WHERE stripe_txn_id = p_stripe_txn_id
  ) INTO v_already_cleared;

  IF v_already_cleared THEN
    -- Already processed, do nothing
    RETURN;
  END IF;

  -- ATOMIC: Lock wallet row and update
  UPDATE public.driver_wallet
  SET 
    reserved_cents = GREATEST(reserved_cents - p_held_amount_cents, 0),
    available_cents = GREATEST(available_cents - p_cleared_amount_cents, 0),
    updated_at = now()
  WHERE driver_id = p_driver_id;

  -- Log to ledger
  INSERT INTO public.wallet_ledger (
    driver_id,
    type,
    amount_cents,
    stripe_auth_id,
    stripe_txn_id,
    notes
  ) VALUES (
    p_driver_id,
    'card_clearing_debit',
    -p_cleared_amount_cents,
    p_stripe_auth_id,
    p_stripe_txn_id,
    'Card transaction cleared'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'finalize_wallet_clearing error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.finalize_wallet_clearing TO service_role;

COMMENT ON FUNCTION public.finalize_wallet_clearing IS 'Finalize card transaction clearing. Releases hold and debits available balance. Idempotent.';

-- ============================================================================
-- PART H: RPC FUNCTION - credit_wallet_from_earnings
-- Mirror driver earnings into wallet (called from finalize-delivery)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.credit_wallet_from_earnings(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_order_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Upsert wallet balance
  INSERT INTO public.driver_wallet (driver_id, available_cents)
  VALUES (p_driver_id, p_amount_cents)
  ON CONFLICT (driver_id)
  DO UPDATE SET
    available_cents = driver_wallet.available_cents + p_amount_cents,
    updated_at = now();

  -- Log to ledger (allow duplicates if called multiple times for same order)
  INSERT INTO public.wallet_ledger (
    driver_id,
    type,
    amount_cents,
    order_id,
    notes
  ) VALUES (
    p_driver_id,
    'earnings_credit',
    p_amount_cents,
    p_order_id,
    'Earnings from order delivery'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'credit_wallet_from_earnings error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.credit_wallet_from_earnings TO service_role;

COMMENT ON FUNCTION public.credit_wallet_from_earnings IS 'Credit driver wallet from delivery earnings. Called from finalize-delivery.';

-- ============================================================================
-- PART I: UPDATE TRIGGER FOR driver_wallet
-- ============================================================================

CREATE OR REPLACE FUNCTION update_driver_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS driver_wallet_updated_at ON public.driver_wallet;
CREATE TRIGGER driver_wallet_updated_at
BEFORE UPDATE ON public.driver_wallet
FOR EACH ROW
EXECUTE FUNCTION update_driver_wallet_updated_at();

-- ============================================================================
-- PART J: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.driver_wallet TO authenticated;
GRANT SELECT ON public.driver_cards TO authenticated;
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.driver_wallet TO service_role;
GRANT ALL ON public.driver_cards TO service_role;
GRANT ALL ON public.wallet_ledger TO service_role;

-- ============================================================================
-- END MIGRATION
-- ============================================================================

