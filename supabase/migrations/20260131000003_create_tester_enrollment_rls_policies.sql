-- RLS Policies for Android Tester Enrollment System
-- Secure access to enrollment and credit data

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE public.android_tester_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tester_credit_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ANDROID_TESTER_ENROLLMENTS Policies
-- ============================================================================

-- Anyone can create an enrollment (anon access for signup)
CREATE POLICY "Anyone can enroll as tester"
ON public.android_tester_enrollments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view their own enrollment
CREATE POLICY "Users can view own enrollment"
ON public.android_tester_enrollments
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.android_tester_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

-- Admins can update enrollments (for selecting testers)
CREATE POLICY "Admins can update enrollments"
ON public.android_tester_enrollments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

-- ============================================================================
-- TESTER_CREDIT_GRANTS Policies
-- ============================================================================

-- Users can view their own credit grants
CREATE POLICY "Users can view own credit grants"
ON public.tester_credit_grants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert credit grants (via RPC function)
CREATE POLICY "System can insert credit grants"
ON public.tester_credit_grants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- System can update credit grants (via RPC function for usage tracking)
CREATE POLICY "System can update credit grants"
ON public.tester_credit_grants
FOR UPDATE
TO authenticated
USING (true);

-- Admins can view all credit grants
CREATE POLICY "Admins can view all credit grants"
ON public.tester_credit_grants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

-- ============================================================================
-- TESTER_CREDIT_LEDGER Policies
-- ============================================================================

-- Users can view their own credit usage history
CREATE POLICY "Users can view own credit ledger"
ON public.tester_credit_ledger
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert ledger entries (via RPC function)
CREATE POLICY "System can insert credit ledger entries"
ON public.tester_credit_ledger
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view all credit ledger entries
CREATE POLICY "Admins can view all credit ledger"
ON public.tester_credit_ledger
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'cto', 'cfo')
  )
);

