-- Android App Tester Enrollment Program
-- Migration: Create enrollment and credit grant tables
-- Credits apply ONLY to Crave'n platform fees (service fees, delivery fees, platform fees)
-- Zero impact on food prices, merchant fees, or feeder payouts

-- ============================================================================
-- A1) ANDROID TESTER ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.android_tester_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  is_selected_tester BOOLEAN DEFAULT false,
  selected_at TIMESTAMP WITH TIME ZONE,
  selected_by UUID REFERENCES auth.users(id),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_email
ON public.android_tester_enrollments(email);

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_platform
ON public.android_tester_enrollments(platform);

-- Index for selected testers
CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_selected
ON public.android_tester_enrollments(is_selected_tester)
WHERE is_selected_tester = true;

-- ============================================================================
-- A2) TESTER CREDIT GRANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES public.android_tester_enrollments(id) ON DELETE SET NULL,
  grant_type TEXT NOT NULL CHECK (grant_type IN ('base_enrollment', 'selected_tester_bonus')),
  credit_cents INTEGER NOT NULL CHECK (credit_cents > 0),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_cents INTEGER DEFAULT 0 CHECK (used_cents >= 0),
  is_expired BOOLEAN DEFAULT false,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, enrollment_id, grant_type)
);

-- Index for active credits lookup
CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_user_active
ON public.tester_credit_grants(user_id, expires_at, is_expired, is_revoked)
WHERE is_expired = false AND is_revoked = false;

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_expires
ON public.tester_credit_grants(expires_at)
WHERE is_expired = false;

-- Index for enrollment tracking
CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_enrollment
ON public.tester_credit_grants(enrollment_id);

-- ============================================================================
-- A3) TESTER CREDIT USAGE LEDGER (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_grant_id UUID REFERENCES public.tester_credit_grants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('service_fee', 'delivery_fee', 'platform_fee')),
  credit_cents INTEGER NOT NULL CHECK (credit_cents > 0),
  fee_type_before_credit TEXT NOT NULL,
  fee_amount_before_credit_cents INTEGER NOT NULL,
  fee_amount_after_credit_cents INTEGER NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for order tracking
CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_order
ON public.tester_credit_ledger(order_id)
WHERE order_id IS NOT NULL;

-- Index for user credit history
CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_user
ON public.tester_credit_ledger(user_id, applied_at);

-- Index for credit grant tracking
CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_grant
ON public.tester_credit_ledger(credit_grant_id);

-- ============================================================================
-- A4) ADD COLUMNS TO ORDERS TABLE FOR TESTER CREDITS
-- ============================================================================
DO $$
BEGIN
  -- Tester credit tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'tester_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tester_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'tester_service_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tester_service_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'tester_delivery_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tester_delivery_credit_applied_cents INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'tester_platform_credit_applied_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tester_platform_credit_applied_cents INTEGER DEFAULT 0;
  END IF;
END $$;

-- Index for tester credit tracking
CREATE INDEX IF NOT EXISTS idx_orders_tester_credit
ON public.orders(tester_credit_applied_cents)
WHERE tester_credit_applied_cents > 0;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.android_tester_enrollments IS 'Android/iOS tester enrollment records - email-based enrollment before account creation';
COMMENT ON TABLE public.tester_credit_grants IS 'Credit grants issued to testers - $25 base + $50 bonus for selected testers, expires 30 days after issuance';
COMMENT ON TABLE public.tester_credit_ledger IS 'Audit trail for tester credit usage - tracks which fees credits were applied to';
COMMENT ON COLUMN public.android_tester_enrollments.is_selected_tester IS 'True if user was selected as one of the 100 official testers';
COMMENT ON COLUMN public.tester_credit_grants.grant_type IS 'base_enrollment: $25 for all enrolled users, selected_tester_bonus: additional $50 for selected testers';
COMMENT ON COLUMN public.tester_credit_grants.expires_at IS 'Credits expire 30 days after issuance';
COMMENT ON COLUMN public.tester_credit_ledger.credit_type IS 'Type of fee credit was applied to: service_fee, delivery_fee, or platform_fee';
COMMENT ON COLUMN public.orders.tester_credit_applied_cents IS 'Total tester credit applied to this order (service + delivery + platform fees only)';

