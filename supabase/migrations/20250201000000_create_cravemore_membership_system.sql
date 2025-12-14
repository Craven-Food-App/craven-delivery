-- CraveMore Membership System
-- Complete implementation per spec

-- 1. cravemore_plans table
CREATE TABLE IF NOT EXISTS public.cravemore_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL CHECK (plan_key IN ('monthly', 'annual', 'lifetime')),
  display_name TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('month', 'year', 'one_time')),
  price_cents INTEGER NOT NULL,
  promo_price_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_most_popular BOOLEAN DEFAULT false,
  badge_text TEXT,
  lifetime_cap_total INTEGER,
  lifetime_cap_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. cravemore_promos table
CREATE TABLE IF NOT EXISTS public.cravemore_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_key TEXT UNIQUE NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. user_memberships table (replaces/extends user_subscriptions for CraveMore)
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('monthly', 'annual', 'lifetime')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  renews_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  provider TEXT DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  founding_member BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. membership_entitlements table
CREATE TABLE IF NOT EXISTS public.membership_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  zero_delivery_fee BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  early_access BOOLEAN DEFAULT false,
  member_discounts BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add cravemore_eligible to merchants (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
    ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS cravemore_eligible BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 6. Add cravemore_eligible to zones (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'zones') THEN
    ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS cravemore_eligible BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.cravemore_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cravemore_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cravemore_plans
DROP POLICY IF EXISTS "Anyone can view active cravemore plans" ON public.cravemore_plans;
CREATE POLICY "Anyone can view active cravemore plans"
  ON public.cravemore_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cravemore plans" ON public.cravemore_plans;
CREATE POLICY "Admins can manage cravemore plans"
  ON public.cravemore_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for cravemore_promos
DROP POLICY IF EXISTS "Anyone can view active cravemore promos" ON public.cravemore_promos;
CREATE POLICY "Anyone can view active cravemore promos"
  ON public.cravemore_promos FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cravemore promos" ON public.cravemore_promos;
CREATE POLICY "Admins can manage cravemore promos"
  ON public.cravemore_promos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for user_memberships
DROP POLICY IF EXISTS "Users can view their own membership" ON public.user_memberships;
CREATE POLICY "Users can view their own membership"
  ON public.user_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own membership" ON public.user_memberships;
CREATE POLICY "Users can create their own membership"
  ON public.user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own membership" ON public.user_memberships;
CREATE POLICY "Users can update their own membership"
  ON public.user_memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all memberships" ON public.user_memberships;
CREATE POLICY "Admins can view all memberships"
  ON public.user_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can update memberships" ON public.user_memberships;
CREATE POLICY "System can update memberships"
  ON public.user_memberships FOR UPDATE
  TO authenticated
  USING (true); -- Edge functions need this

-- RLS Policies for membership_entitlements
DROP POLICY IF EXISTS "Users can view their own entitlements" ON public.membership_entitlements;
CREATE POLICY "Users can view their own entitlements"
  ON public.membership_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage entitlements" ON public.membership_entitlements;
CREATE POLICY "System can manage entitlements"
  ON public.membership_entitlements FOR ALL
  TO authenticated
  USING (true); -- Edge functions need this

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_plan_key ON public.user_memberships(plan_key);
CREATE INDEX IF NOT EXISTS idx_membership_entitlements_user_id ON public.membership_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_cravemore_plans_plan_key ON public.cravemore_plans(plan_key);
CREATE INDEX IF NOT EXISTS idx_cravemore_promos_active ON public.cravemore_promos(is_active, starts_at, ends_at);

-- Insert default plans (Standard Pricing)
INSERT INTO public.cravemore_plans (plan_key, display_name, billing_period, price_cents, is_active, is_most_popular, badge_text, lifetime_cap_total, lifetime_cap_used) VALUES
  ('monthly', 'Monthly', 'month', 949, true, false, NULL, NULL, NULL),
  ('annual', 'Annual', 'year', 8900, true, true, 'Most Popular', NULL, NULL),
  ('lifetime', 'Lifetime', 'one_time', 29900, true, false, 'Founding Member', 1000, 0)
ON CONFLICT (plan_key) DO NOTHING;

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_cravemore_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cravemore_plans_updated_at
  BEFORE UPDATE ON public.cravemore_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_cravemore_updated_at();

CREATE TRIGGER user_memberships_updated_at
  BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_cravemore_updated_at();

CREATE TRIGGER membership_entitlements_updated_at
  BEFORE UPDATE ON public.membership_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_cravemore_updated_at();

-- Function to sync entitlements from membership status
CREATE OR REPLACE FUNCTION sync_membership_entitlements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.membership_entitlements (user_id, zero_delivery_fee, priority_support, early_access, member_discounts)
    VALUES (NEW.user_id, true, true, true, true)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      zero_delivery_fee = true,
      priority_support = true,
      early_access = true,
      member_discounts = true,
      updated_at = NOW();
  ELSE
    UPDATE public.membership_entitlements
    SET 
      zero_delivery_fee = false,
      priority_support = false,
      early_access = false,
      member_discounts = false,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_entitlements_on_membership_change
  AFTER INSERT OR UPDATE ON public.user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_membership_entitlements();

-- Function to check if user has active CraveMore membership
CREATE OR REPLACE FUNCTION has_active_cravemore(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (renews_at IS NULL OR renews_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get effective price (promo or standard)
CREATE OR REPLACE FUNCTION get_cravemore_price(p_plan_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_plan RECORD;
  v_promo RECORD;
  v_price INTEGER;
BEGIN
  SELECT * INTO v_plan FROM public.cravemore_plans WHERE plan_key = p_plan_key AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check for active promo
  SELECT * INTO v_promo FROM public.cravemore_promos 
  WHERE is_active = true 
    AND NOW() >= starts_at 
    AND NOW() <= ends_at
  LIMIT 1;
  
  IF v_promo IS NOT NULL AND v_plan.promo_price_cents IS NOT NULL THEN
    RETURN v_plan.promo_price_cents;
  END IF;
  
  RETURN v_plan.price_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment lifetime cap (atomic)
CREATE OR REPLACE FUNCTION increment_lifetime_cap()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.cravemore_plans
  SET lifetime_cap_used = COALESCE(lifetime_cap_used, 0) + 1
  WHERE plan_key = 'lifetime'
    AND (lifetime_cap_used IS NULL OR lifetime_cap_used < lifetime_cap_total)
  RETURNING lifetime_cap_used INTO v_updated;
  
  RETURN COALESCE(v_updated, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_active_cravemore TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_cravemore_price TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_lifetime_cap TO authenticated;

-- Comments
COMMENT ON TABLE public.cravemore_plans IS 'CraveMore membership plan definitions with pricing';
COMMENT ON TABLE public.cravemore_promos IS 'CraveMore promotional pricing windows';
COMMENT ON TABLE public.user_memberships IS 'User CraveMore membership records';
COMMENT ON TABLE public.membership_entitlements IS 'Computed CraveMore membership entitlements';

