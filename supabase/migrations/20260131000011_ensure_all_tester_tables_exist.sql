-- Ensure All Tester Enrollment Tables Exist
-- This migration ensures all required tables exist, even if previous migrations weren't run
-- Run this if you're getting "table not found" errors

-- ============================================================================
-- 1) android_tester_enrollments - Main enrollment table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.android_tester_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  is_selected_tester BOOLEAN DEFAULT false,
  selected_at TIMESTAMP WITH TIME ZONE,
  selected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Enhanced columns (added in later migration)
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'activated', 'in_progress', 'eligible', 'issued', 'expired')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  deadline_at TIMESTAMP WITH TIME ZONE,
  referral_code TEXT,
  notes TEXT,
  tester_reward_status TEXT DEFAULT 'enrolled' CHECK (tester_reward_status IN ('enrolled', 'testing', 'issued'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_email
ON public.android_tester_enrollments(email);

CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_platform
ON public.android_tester_enrollments(platform);

CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_selected
ON public.android_tester_enrollments(is_selected_tester)
WHERE is_selected_tester = true;

CREATE INDEX IF NOT EXISTS idx_tester_enrollments_user_id 
ON public.android_tester_enrollments(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tester_enrollments_status 
ON public.android_tester_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_tester_enrollments_referral_code 
ON public.android_tester_enrollments(referral_code) 
WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_android_tester_enrollments_reward_status
ON public.android_tester_enrollments(tester_reward_status);

-- ============================================================================
-- 2) tester_credit_grants - Credit grants table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES public.android_tester_enrollments(id) ON DELETE SET NULL,
  grant_type TEXT NOT NULL CHECK (grant_type IN ('base_enrollment', 'selected_tester_bonus', 'tier_a', 'tier_b', 'tier_c')),
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_user_active
ON public.tester_credit_grants(user_id, expires_at, is_expired, is_revoked)
WHERE is_expired = false AND is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_expires
ON public.tester_credit_grants(expires_at)
WHERE is_expired = false;

CREATE INDEX IF NOT EXISTS idx_tester_credit_grants_enrollment
ON public.tester_credit_grants(enrollment_id);

-- ============================================================================
-- 3) tester_credit_ledger - Credit usage audit trail
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_order
ON public.tester_credit_ledger(order_id)
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_user
ON public.tester_credit_ledger(user_id, applied_at);

CREATE INDEX IF NOT EXISTS idx_tester_credit_ledger_grant
ON public.tester_credit_ledger(credit_grant_id);

-- ============================================================================
-- 4) tester_activity_days - Track distinct active days
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_activity_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_tester_activity_days_user_date 
ON public.tester_activity_days(user_id, activity_date);

-- ============================================================================
-- 5) tester_feedback_events - Micro-feedback submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_key TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, prompt_key)
);

CREATE INDEX IF NOT EXISTS idx_tester_feedback_events_user 
ON public.tester_feedback_events(user_id);

-- ============================================================================
-- 6) tester_referrals - Referral tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_type TEXT NOT NULL CHECK (referral_type IN ('driver', 'merchant', 'customer')),
  referred_email TEXT,
  referred_phone TEXT,
  merchant_name TEXT,
  merchant_contact_name TEXT,
  merchant_contact_email TEXT,
  merchant_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'invited', 'started', 'completed', 'rejected')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_referrals_referrer 
ON public.tester_referrals(referrer_user_id, referral_type, status);

-- ============================================================================
-- 7) tester_reward_issuances - Track which tiers have been issued
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_reward_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('tier_a', 'tier_b', 'tier_c')),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  credit_grant_id UUID REFERENCES public.tester_credit_grants(id) ON DELETE SET NULL,
  UNIQUE(user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_tester_reward_issuances_user 
ON public.tester_reward_issuances(user_id);

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE public.android_tester_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_activity_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_reward_issuances ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.android_tester_enrollments IS 'Android/iOS tester enrollment records';
COMMENT ON TABLE public.tester_credit_grants IS 'Credit grants issued to testers';
COMMENT ON TABLE public.tester_credit_ledger IS 'Audit trail of credit usage';
COMMENT ON TABLE public.tester_activity_days IS 'Tracks distinct days user opened the app';
COMMENT ON TABLE public.tester_feedback_events IS 'Micro-feedback submissions from testers';
COMMENT ON TABLE public.tester_referrals IS 'Referral tracking for Tier C rewards';
COMMENT ON TABLE public.tester_reward_issuances IS 'Tracks which reward tiers have been issued to users';

