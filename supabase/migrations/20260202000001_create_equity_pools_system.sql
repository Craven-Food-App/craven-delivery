-- ==============================================================================
-- CREATE EQUITY POOLS SYSTEM
-- ==============================================================================
-- Supports micro-equity program with dedicated pool tracking
-- ==============================================================================

-- 1. Equity Pools Table
CREATE TABLE IF NOT EXISTS public.equity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_code TEXT UNIQUE NOT NULL,
  pool_name TEXT NOT NULL,
  total_reserved_shares BIGINT NOT NULL DEFAULT 0,
  remaining_reserved_shares BIGINT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT equity_pools_remaining_check 
    CHECK (remaining_reserved_shares >= 0 AND remaining_reserved_shares <= total_reserved_shares)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_equity_pools_pool_code ON public.equity_pools(pool_code);

-- Enable RLS
ALTER TABLE public.equity_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies: CEO and admins can manage pools
CREATE POLICY "equity_pools_admin_access" ON public.equity_pools
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- 2. Initialize Family Micro-Equity Pool
-- This pool is reserved exclusively for foundational invite program
INSERT INTO public.equity_pools (
  pool_code,
  pool_name,
  total_reserved_shares,
  remaining_reserved_shares,
  description
)
VALUES (
  'family_micro_equity_pool',
  'Family & Friends Micro-Equity Pool',
  1400000, -- 1.4M shares (2% of 70M authorized)
  1400000, -- Initially all available
  'Reserved exclusively for Family & Friends Tier Program equity issuances. All shares issued under issuance_context="family_micro_equity" must come from this pool.'
)
ON CONFLICT (pool_code) DO NOTHING;

-- 3. Contribution Orders Table
-- Tracks each contribution payment from foundational invites
CREATE TABLE IF NOT EXISTS public.contribution_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  contributor_email TEXT NOT NULL,
  contributor_name TEXT,
  amount_cents INTEGER NOT NULL,
  shares_promised BIGINT NOT NULL, -- Calculated based on tier
  tier_name TEXT NOT NULL, -- e.g., "Supporter Tier", "Partner Tier", etc.
  equity_percentage NUMERIC(5,2) NOT NULL, -- e.g., 0.2, 0.6, 0.8, 1.0
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contribution_orders_invite_id ON public.contribution_orders(invite_id);
CREATE INDEX IF NOT EXISTS idx_contribution_orders_payment_status ON public.contribution_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_contribution_orders_contributor_email ON public.contribution_orders(contributor_email);

-- Unique constraint: one contribution order per invite (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contribution_orders_invite_unique 
  ON public.contribution_orders(invite_id) 
  WHERE payment_status = 'paid';

-- Enable RLS
ALTER TABLE public.contribution_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "contribution_orders_admin_access" ON public.contribution_orders
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Contributors can view their own orders
CREATE POLICY "contribution_orders_contributor_access" ON public.contribution_orders
  FOR SELECT
  USING (
    contributor_email = (auth.jwt() ->> 'email')
  );

-- 4. Equity Issuances Table
-- Tracks all equity issuances, including micro-equity program
CREATE TABLE IF NOT EXISTS public.equity_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuance_context TEXT NOT NULL, -- e.g., 'family_micro_equity', 'employee_grant', etc.
  equity_source TEXT NOT NULL, -- e.g., 'family_micro_equity', 'equity_pool', etc.
  equity_pool_id UUID REFERENCES public.equity_pools(id) ON DELETE RESTRICT,
  equity_pool_code TEXT, -- Denormalized for fast lookups
  contributor_id UUID, -- References auth.users if contributor has account
  contribution_order_id UUID REFERENCES public.contribution_orders(id) ON DELETE SET NULL,
  shares_issued BIGINT NOT NULL,
  strike_price_per_share NUMERIC(10,6), -- NULL for micro-equity (no strike price)
  issuance_status TEXT NOT NULL DEFAULT 'pending' CHECK (issuance_status IN ('pending', 'issued', 'cancelled', 'reversed')),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Validation: micro-equity issuances must have pool reference
  CONSTRAINT equity_issuances_micro_equity_pool_check 
    CHECK (
      (issuance_context != 'family_micro_equity') 
      OR (equity_pool_id IS NOT NULL AND equity_pool_code = 'family_micro_equity_pool')
    ),
  -- Validation: micro-equity issuances must have NULL strike price
  CONSTRAINT equity_issuances_micro_equity_strike_check
    CHECK (
      (issuance_context != 'family_micro_equity') 
      OR (strike_price_per_share IS NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equity_issuances_context ON public.equity_issuances(issuance_context);
CREATE INDEX IF NOT EXISTS idx_equity_issuances_pool_id ON public.equity_issuances(equity_pool_id);
CREATE INDEX IF NOT EXISTS idx_equity_issuances_pool_code ON public.equity_issuances(equity_pool_code);
CREATE INDEX IF NOT EXISTS idx_equity_issuances_contributor ON public.equity_issuances(contributor_id);
CREATE INDEX IF NOT EXISTS idx_equity_issuances_order ON public.equity_issuances(contribution_order_id);
CREATE INDEX IF NOT EXISTS idx_equity_issuances_status ON public.equity_issuances(issuance_status);

-- Enable RLS
ALTER TABLE public.equity_issuances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "equity_issuances_admin_access" ON public.equity_issuances
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Contributors can view their own issuances
CREATE POLICY "equity_issuances_contributor_access" ON public.equity_issuances
  FOR SELECT
  USING (
    contributor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.contribution_orders
      WHERE contribution_orders.id = equity_issuances.contribution_order_id
      AND contribution_orders.contributor_email = (auth.jwt() ->> 'email')
    )
  );

-- 5. Cap Table Holdings Table
-- Tracks individual shareholder holdings from all sources
CREATE TABLE IF NOT EXISTS public.cap_table_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_email TEXT NOT NULL, -- Email is primary identifier (may not have account)
  holder_name TEXT,
  holder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If they have account
  shares_total BIGINT NOT NULL DEFAULT 0,
  share_class TEXT DEFAULT 'Common',
  equity_source TEXT NOT NULL, -- e.g., 'family_micro_equity', 'employee_grant', etc.
  issuance_id UUID REFERENCES public.equity_issuances(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure non-negative shares
  CONSTRAINT cap_table_holdings_shares_check 
    CHECK (shares_total >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cap_table_holdings_email ON public.cap_table_holdings(holder_email);
CREATE INDEX IF NOT EXISTS idx_cap_table_holdings_user_id ON public.cap_table_holdings(holder_user_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_holdings_source ON public.cap_table_holdings(equity_source);
CREATE INDEX IF NOT EXISTS idx_cap_table_holdings_issuance ON public.cap_table_holdings(issuance_id);

-- Unique constraint: one holding record per email+source combination
-- (Allows same person to have holdings from multiple sources)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cap_table_holdings_email_source 
  ON public.cap_table_holdings(holder_email, equity_source) 
  WHERE equity_source = 'family_micro_equity';

-- Enable RLS
ALTER TABLE public.cap_table_holdings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "cap_table_holdings_admin_access" ON public.cap_table_holdings
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'tstroman.ceo@cravenusa.com'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'ceo', 'super_admin')
    )
  );

-- Holders can view their own holdings
CREATE POLICY "cap_table_holdings_holder_access" ON public.cap_table_holdings
  FOR SELECT
  USING (
    holder_email = (auth.jwt() ->> 'email')
    OR holder_user_id = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE public.equity_pools IS 'Tracks reserved equity pools. The family_micro_equity_pool is exclusively for foundational invite program.';
COMMENT ON TABLE public.contribution_orders IS 'Tracks contribution payments from foundational invites. Links to equity issuances when payment completes.';
COMMENT ON TABLE public.equity_issuances IS 'Tracks all equity issuances. Micro-equity issuances must reference family_micro_equity_pool and have NULL strike_price.';
COMMENT ON TABLE public.cap_table_holdings IS 'Tracks individual shareholder holdings. Aggregates shares from all issuance sources.';

COMMENT ON COLUMN public.equity_issuances.equity_pool_code IS 'Denormalized pool code for fast lookups. Must equal "family_micro_equity_pool" when issuance_context="family_micro_equity".';
COMMENT ON COLUMN public.equity_issuances.strike_price_per_share IS 'Must be NULL for family_micro_equity issuances (no strike price for micro-equity).';

