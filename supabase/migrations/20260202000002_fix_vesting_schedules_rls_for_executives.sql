-- Fix RLS policies for vesting_schedules to allow executives to manage (INSERT/UPDATE/DELETE)
-- This is needed for the equity grants edit functionality

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Executives can manage vesting schedules" ON public.vesting_schedules;

-- Create policy allowing executives to manage vesting schedules
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

