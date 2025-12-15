-- Allow inserting rows into cto_evaluation_gates from evaluation starter functions
-- while still enforcing RLS for reads and updates.

-- Drop any overly strict insert policy if it exists (none by default, but safe)
DROP POLICY IF EXISTS "cto_gates_insert" ON public.cto_evaluation_gates;

-- New insert policy:
-- - Real evaluations: CEO / universal access only
-- - Test evaluations: any authenticated user who owns the test evaluation (ceo_user_id = auth.uid())
CREATE POLICY "cto_gates_insert"
ON public.cto_evaluation_gates
FOR INSERT
WITH CHECK (
  -- Real evaluations: same as CEO manage policy
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  -- Test evaluations: allow creator of the test eval to insert gates
  OR EXISTS (
    SELECT 1
    FROM public.cto_evaluations e
    WHERE e.id = evaluation_id
      AND e.is_test = true
      AND e.ceo_user_id = auth.uid()
  )
);


