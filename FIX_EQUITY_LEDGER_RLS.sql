-- FIX RLS FOR EQUITY_LEDGER - Allow Torrance and executives to see all entries
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Executives can view equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can manage equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Users can view own equity ledger" ON public.equity_ledger;
DROP POLICY IF EXISTS "Executives can view all equity ledger" ON public.equity_ledger;

-- Policy 1: Users can ALWAYS view their own equity ledger entries
CREATE POLICY "Users can view own equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- Policy 2: Torrance (CEO) can view ALL equity ledger entries
CREATE POLICY "CEO can view all equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
);

-- Policy 3: Executives in exec_users can view all equity ledger entries
CREATE POLICY "Executives can view all equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
);

-- Policy 4: Users with CRAVEN_FOUNDER or CRAVEN_CORPORATE_SECRETARY roles can view all
CREATE POLICY "Founders and Corporate Secretary can view all equity ledger"
ON public.equity_ledger FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CORPORATE_SECRETARY', 'CRAVEN_CEO')
  )
);

-- Policy 5: Service role can manage equity ledger
DROP POLICY IF EXISTS "Service role can manage equity ledger" ON public.equity_ledger;
CREATE POLICY "Service role can manage equity ledger"
ON public.equity_ledger FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies were created
SELECT 
  'RLS POLICIES CREATED' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'equity_ledger'
ORDER BY policyname;

-- Test query as Torrance (should see all 3 entries)
-- This simulates what the frontend should see
SELECT 
  'TEST QUERY (should see 3 entries)' as info,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE transaction_type = 'grant') as grants,
  COUNT(*) FILTER (WHERE transaction_type = 'cancellation') as cancellations
FROM equity_ledger;

