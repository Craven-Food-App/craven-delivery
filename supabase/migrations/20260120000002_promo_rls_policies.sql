-- RLS Policies for Promo System
-- Users can read their own wallet/ledger, but only service role can write

-- ============================================================================
-- PROMO_WALLETS RLS
-- ============================================================================
ALTER TABLE public.promo_wallets ENABLE ROW LEVEL SECURITY;

-- Users can select their own wallet row
DROP POLICY IF EXISTS "Users can view own wallet" ON public.promo_wallets;
CREATE POLICY "Users can view own wallet" 
ON public.promo_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users cannot insert/update directly (service role only)
-- No INSERT/UPDATE policies for authenticated users

-- ============================================================================
-- PROMO_LEDGER RLS
-- ============================================================================
ALTER TABLE public.promo_ledger ENABLE ROW LEVEL SECURITY;

-- Users can select their own ledger rows
DROP POLICY IF EXISTS "Users can view own ledger" ON public.promo_ledger;
CREATE POLICY "Users can view own ledger" 
ON public.promo_ledger 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users cannot insert/update directly (service role only)
-- No INSERT/UPDATE policies for authenticated users

-- ============================================================================
-- PROMOTIONS RLS
-- ============================================================================
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public select for active promo row (read-only)
DROP POLICY IF EXISTS "Public can view active promotions" ON public.promotions;
CREATE POLICY "Public can view active promotions" 
ON public.promotions 
FOR SELECT 
USING (is_active = true);

-- Service role can manage (no explicit policy needed - service role bypasses RLS)
















