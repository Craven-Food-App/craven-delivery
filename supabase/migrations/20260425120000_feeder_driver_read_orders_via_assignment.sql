-- Feeders with an order_assignments row for an order can read that order and its
-- line items even if orders.driver_id is not set yet (pending) or a claim update lags.
-- This fixes mobile accept flows that SELECT orders / order_items after claim.

CREATE POLICY "Drivers can view orders for their assignments"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.order_assignments oa
    WHERE oa.order_id = orders.id
      AND oa.driver_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view order items for their assignments"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.order_assignments oa
    WHERE oa.order_id = order_items.order_id
      AND oa.driver_id = auth.uid()
  )
);
