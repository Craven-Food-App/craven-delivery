-- RLS Policies for Enhanced Tester Enrollment System

-- ============================================================================
-- tester_activity_days
-- ============================================================================
ALTER TABLE public.tester_activity_days ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON public.tester_activity_days
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own activity (via RPC)
CREATE POLICY "Users can insert own activity"
  ON public.tester_activity_days
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- tester_feedback_events
-- ============================================================================
ALTER TABLE public.tester_feedback_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.tester_feedback_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own feedback
CREATE POLICY "Users can manage own feedback"
  ON public.tester_feedback_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- tester_referrals
-- ============================================================================
ALTER TABLE public.tester_referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
  ON public.tester_referrals
  FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Users can insert their own referrals
CREATE POLICY "Users can insert own referrals"
  ON public.tester_referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referrer_user_id);

-- Users can update their own referrals
CREATE POLICY "Users can update own referrals"
  ON public.tester_referrals
  FOR UPDATE
  USING (auth.uid() = referrer_user_id)
  WITH CHECK (auth.uid() = referrer_user_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON public.tester_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update referral status
CREATE POLICY "Admins can update referral status"
  ON public.tester_referrals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- tester_reward_issuances
-- ============================================================================
ALTER TABLE public.tester_reward_issuances ENABLE ROW LEVEL SECURITY;

-- Users can view their own issuances
CREATE POLICY "Users can view own issuances"
  ON public.tester_reward_issuances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (via Edge Function)
-- No user-insert policy

-- Admins can view all issuances
CREATE POLICY "Admins can view all issuances"
  ON public.tester_reward_issuances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- android_tester_enrollments (update existing policies)
-- ============================================================================
-- Users can view their own enrollment
CREATE POLICY IF NOT EXISTS "Users can view own enrollment"
  ON public.android_tester_enrollments
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Anonymous can insert (enrollment)
CREATE POLICY IF NOT EXISTS "Anonymous can enroll"
  ON public.android_tester_enrollments
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own enrollment (limited fields)
CREATE POLICY IF NOT EXISTS "Users can update own enrollment"
  ON public.android_tester_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all enrollments
CREATE POLICY IF NOT EXISTS "Admins can view all enrollments"
  ON public.android_tester_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Admins can update enrollments
CREATE POLICY IF NOT EXISTS "Admins can update enrollments"
  ON public.android_tester_enrollments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

