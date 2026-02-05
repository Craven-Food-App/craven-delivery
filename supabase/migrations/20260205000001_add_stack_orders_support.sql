-- Add stack order support to orders table
-- Allows customers to stack multiple orders for single delivery

-- Add columns for order stacking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_stacked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stack_parent_order_id UUID REFERENCES public.orders(id),
ADD COLUMN IF NOT EXISTS stack_order_number INTEGER DEFAULT 1;

-- Add index for efficient stack order queries
CREATE INDEX IF NOT EXISTS idx_orders_stack_parent ON public.orders(stack_parent_order_id) WHERE stack_parent_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_is_stacked ON public.orders(is_stacked) WHERE is_stacked = TRUE;

-- Add comment
COMMENT ON COLUMN public.orders.is_stacked IS 'Indicates if this order is part of a stacked delivery';
COMMENT ON COLUMN public.orders.stack_parent_order_id IS 'References the initial order in a stack. NULL for first order in stack.';
COMMENT ON COLUMN public.orders.stack_order_number IS 'Order sequence in the stack (1 for first, 2 for second, etc.)';

-- Create view for complete stack orders (includes all orders in a stack)
CREATE OR REPLACE VIEW public.stacked_orders_view AS
SELECT 
  o1.id as stack_parent_id,
  o1.customer_id,
  o1.created_at as stack_created_at,
  o1.order_status as parent_status,
  COUNT(o2.id) as total_orders_in_stack,
  SUM(o2.total_cents) as combined_total_cents,
  json_agg(
    json_build_object(
      'order_id', o2.id,
      'restaurant_id', o2.restaurant_id,
      'order_number', o2.stack_order_number,
      'subtotal_cents', o2.subtotal_cents,
      'total_cents', o2.total_cents,
      'order_status', o2.order_status
    ) ORDER BY o2.stack_order_number
  ) as orders
FROM 
  public.orders o1
LEFT JOIN public.orders o2 ON (o2.id = o1.id OR o2.stack_parent_order_id = o1.id)
WHERE 
  o1.is_stacked = TRUE 
  AND o1.stack_parent_order_id IS NULL
GROUP BY 
  o1.id, o1.customer_id, o1.created_at, o1.order_status;

COMMENT ON VIEW public.stacked_orders_view IS 'Aggregated view of all stacked orders showing the parent order and all child orders';

