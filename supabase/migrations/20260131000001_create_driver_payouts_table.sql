-- ========================================================================
-- DRIVER INSTANT PAYOUTS TABLE
-- Tracks all driver-initiated instant payouts via Stripe
-- ========================================================================

-- Drop existing table if it exists (to ensure clean state)
DROP TABLE IF EXISTS public.driver_payouts CASCADE;

CREATE TABLE public.driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  stripe_payout_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  payout_type TEXT NOT NULL CHECK (payout_type IN ('instant', 'standard')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  arrival_date TIMESTAMP WITH TIME ZONE,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS driver_payouts_driver_id_idx 
ON public.driver_payouts(driver_id);

CREATE INDEX IF NOT EXISTS driver_payouts_stripe_payout_id_idx 
ON public.driver_payouts(stripe_payout_id);

CREATE INDEX IF NOT EXISTS driver_payouts_status_idx 
ON public.driver_payouts(status);

CREATE INDEX IF NOT EXISTS driver_payouts_created_at_idx 
ON public.driver_payouts(created_at DESC);

-- RLS: Drivers can view their own payouts
ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "drivers_can_view_own_payouts" ON public.driver_payouts;
DROP POLICY IF EXISTS "service_role_can_manage_payouts" ON public.driver_payouts;
DROP POLICY IF EXISTS "admin_full_access_payouts" ON public.driver_payouts;

-- Drivers can read their own payouts
CREATE POLICY "drivers_can_view_own_payouts" ON public.driver_payouts
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Service role can insert/update (via Edge Functions only)
CREATE POLICY "service_role_can_manage_payouts" ON public.driver_payouts
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Admin access
CREATE POLICY "admin_full_access_payouts" ON public.driver_payouts
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_driver_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS driver_payouts_updated_at ON public.driver_payouts;
CREATE TRIGGER driver_payouts_updated_at
BEFORE UPDATE ON public.driver_payouts
FOR EACH ROW
EXECUTE FUNCTION update_driver_payouts_updated_at();

-- Grant permissions
GRANT SELECT ON public.driver_payouts TO authenticated;
GRANT ALL ON public.driver_payouts TO service_role;

