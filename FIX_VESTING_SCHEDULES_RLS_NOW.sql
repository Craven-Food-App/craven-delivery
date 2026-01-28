-- IMMEDIATE FIX: Allow executives to manage vesting_schedules
-- Run this in Supabase SQL Editor to fix the RLS error immediately

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Executives can manage vesting schedules" ON public.vesting_schedules;

-- Create policy allowing executives to manage vesting schedules (INSERT/UPDATE/DELETE)
CREATE POLICY "Executives can manage vesting schedules"
ON public.vesting_schedules FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

-- Also ensure equity_ledger has the same policy for consistency
DROP POLICY IF EXISTS "Executives can manage equity ledger" ON public.equity_ledger;

CREATE POLICY "Executives can manage equity ledger"
ON public.equity_ledger FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

