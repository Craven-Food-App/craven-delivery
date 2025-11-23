-- Fix RLS policies for equity_ledger and vesting_schedules
-- Ensure executives can view their own equity data even if exec_users check fails

-- Drop existing policies
DROP POLICY IF EXISTS "Executives can view equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can manage equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can view vesting schedules" ON public.vesting_schedules;
DROP POLICY IF EXISTS "Executives can manage vesting schedules" ON public.vesting_schedules;

-- New policy: Users can ALWAYS view their own equity ledger entries
CREATE POLICY "Users can view own equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- New policy: Executives can view all equity ledger entries (for admin purposes)
CREATE POLICY "Executives can view all equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

-- New policy: Service role can manage equity ledger
CREATE POLICY "Service role can manage equity ledger"
ON public.equity_ledger FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- New policy: Users can ALWAYS view their own vesting schedules
CREATE POLICY "Users can view own vesting schedules"
ON public.vesting_schedules FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- New policy: Executives can view all vesting schedules (for admin purposes)
CREATE POLICY "Executives can view all vesting schedules"
ON public.vesting_schedules FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

-- New policy: Service role can manage vesting schedules
CREATE POLICY "Service role can manage vesting schedules"
ON public.vesting_schedules FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also fix share_certificates policies
DROP POLICY IF EXISTS "Executives can view share certificates" ON public.share_certificates;
DROP POLICY IF EXISTS "Executives can manage share certificates" ON public.share_certificates;

CREATE POLICY "Users can view own share certificates"
ON public.share_certificates FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY "Executives can view all share certificates"
ON public.share_certificates FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

CREATE POLICY "Service role can manage share certificates"
ON public.share_certificates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

