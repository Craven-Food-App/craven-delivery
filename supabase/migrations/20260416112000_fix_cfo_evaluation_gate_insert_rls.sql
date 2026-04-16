-- Fix RLS for CFO evaluation gate initialization.
-- start_cfo_evaluation_prefunding() inserts into cfo_evaluation_gates,
-- but this table only had SELECT/UPDATE policies.

DROP POLICY IF EXISTS "cfo_gates_ceo_insert" ON public.cfo_evaluation_gates;

CREATE POLICY "cfo_gates_ceo_insert"
ON public.cfo_evaluation_gates
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
);
