-- Add policy to allow approved feeders to assign themselves to pending orders
CREATE POLICY "Approved feeders can assign themselves to pending orders" 
ON public.orders 
FOR UPDATE 
USING (
  is_approved_craver(auth.uid()) 
  AND status = 'pending'::order_status 
  AND assigned_craver_id IS NULL
)
WITH CHECK (
  is_approved_craver(auth.uid()) 
  AND assigned_craver_id = auth.uid()
  AND status = 'assigned'::order_status
);