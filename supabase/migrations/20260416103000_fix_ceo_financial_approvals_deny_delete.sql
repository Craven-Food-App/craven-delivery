-- Ensure CEO financial approvals support deny/reject and delete operations.

-- 1) Normalize status constraint to accept both legacy and current deny values.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'ceo_financial_approvals'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.ceo_financial_approvals DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

ALTER TABLE public.ceo_financial_approvals
  ADD CONSTRAINT ceo_financial_approvals_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'rejected', 'on-hold', 'cancelled'));

-- 2) Guarantee DELETE permission for CEO users.
DROP POLICY IF EXISTS "Only CEO can delete financial approvals" ON public.ceo_financial_approvals;

CREATE POLICY "Only CEO can delete financial approvals"
ON public.ceo_financial_approvals
FOR DELETE
TO authenticated
USING (
  public.is_ceo(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.ceo_access_credentials WHERE user_email = auth.jwt()->>'email')
);
