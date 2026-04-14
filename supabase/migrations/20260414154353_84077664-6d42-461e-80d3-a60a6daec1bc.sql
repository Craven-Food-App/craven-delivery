-- Allow executives to delete expense requests
CREATE POLICY "Finance executives can delete expense requests"
ON public.expense_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM exec_users
    WHERE exec_users.user_id = auth.uid()
    AND exec_users.role = ANY (ARRAY['ceo'::text, 'cfo'::text, 'coo'::text])
  )
);

-- Allow executives to delete invoices (the existing ALL policy covers this, but adding explicit for clarity)
CREATE POLICY "Finance executives can delete invoices"
ON public.invoices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM exec_users
    WHERE exec_users.user_id = auth.uid()
    AND exec_users.role = ANY (ARRAY['ceo'::text, 'cfo'::text, 'coo'::text])
  )
);