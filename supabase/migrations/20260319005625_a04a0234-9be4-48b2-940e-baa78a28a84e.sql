
DROP POLICY IF EXISTS "Admins can manage regions" ON public.regions;

CREATE POLICY "Admins can manage regions"
ON public.regions
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR is_craven_founder()
)
WITH CHECK (
  is_admin(auth.uid()) OR is_craven_founder()
);
