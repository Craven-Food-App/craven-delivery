-- Enhanced Android Tester Enrollment System - Ecosystem Ladder
-- Migration: Create activity tracking, feedback, referrals, and reward issuance tables

-- ============================================================================
-- 1) UPDATE android_tester_enrollments table
-- ============================================================================
ALTER TABLE public.android_tester_enrollments 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'enrolled' 
    CHECK (status IN ('enrolled', 'activated', 'in_progress', 'eligible', 'issued', 'expired')),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing enrollments
UPDATE public.android_tester_enrollments 
SET status = 'enrolled' 
WHERE status IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tester_enrollments_user_id 
  ON public.android_tester_enrollments(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tester_enrollments_status 
  ON public.android_tester_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_tester_enrollments_referral_code 
  ON public.android_tester_enrollments(referral_code) 
  WHERE referral_code IS NOT NULL;

-- ============================================================================
-- 2) tester_activity_days - Track distinct active days
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_activity_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_tester_activity_days_user_date 
  ON public.tester_activity_days(user_id, activity_date DESC);

-- ============================================================================
-- 3) tester_feedback_events - Micro-feedback prompts
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

CREATE INDEX IF NOT EXISTS idx_tester_feedback_user 
  ON public.tester_feedback_events(user_id, created_at DESC);

-- ============================================================================
-- 4) tester_referrals - All referral types
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
  status TEXT NOT NULL DEFAULT 'submitted' 
    CHECK (status IN ('submitted', 'invited', 'started', 'completed', 'rejected')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_referrals_referrer 
  ON public.tester_referrals(referrer_user_id, referral_type, status);

CREATE INDEX IF NOT EXISTS idx_tester_referrals_status 
  ON public.tester_referrals(status) 
  WHERE status = 'completed';

-- ============================================================================
-- 5) tester_reward_issuances - Prevent double issuance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tester_reward_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('tier_a', 'tier_b', 'tier_c')),
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  credit_grant_id UUID REFERENCES public.tester_credit_grants(id) ON DELETE SET NULL,
  UNIQUE(user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_tester_reward_issuances_user 
  ON public.tester_reward_issuances(user_id);

-- ============================================================================
-- 6) Update tester_credit_grants to support tier_c
-- ============================================================================
ALTER TABLE public.tester_credit_grants 
  DROP CONSTRAINT IF EXISTS tester_credit_grants_grant_type_check;

ALTER TABLE public.tester_credit_grants 
  ADD CONSTRAINT tester_credit_grants_grant_type_check 
    CHECK (grant_type IN ('base_enrollment', 'selected_tester_bonus', 'tier_a', 'tier_b', 'tier_c'));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.tester_activity_days IS 'Tracks distinct days user opened app (for Tier A requirement: 3 days in 7)';
COMMENT ON TABLE public.tester_feedback_events IS 'Micro-feedback prompts (Tier A requirement: 2 completed)';
COMMENT ON TABLE public.tester_referrals IS 'All referral types: driver, merchant, customer (for Tier C)';
COMMENT ON TABLE public.tester_reward_issuances IS 'Prevents double issuance of rewards per tier';
COMMENT ON COLUMN public.android_tester_enrollments.status IS 'State machine: enrolled → activated → in_progress → eligible → issued → expired';
COMMENT ON COLUMN public.android_tester_enrollments.deadline_at IS 'activated_at + 7 days (Tier A deadline)';
COMMENT ON COLUMN public.tester_referrals.status IS 'submitted → invited → started → completed (completion triggers Tier C evaluation)';

