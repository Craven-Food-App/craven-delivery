-- Add split payment support to payments table

-- Add columns for tracking split payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS split_payment_index INTEGER,
ADD COLUMN IF NOT EXISTS payment_method_id TEXT;

-- Add index for split payment queries
CREATE INDEX IF NOT EXISTS idx_payments_split ON public.payments(order_id, is_split_payment) WHERE is_split_payment = TRUE;
CREATE INDEX IF NOT EXISTS idx_payments_split_index ON public.payments(order_id, split_payment_index);

-- Add comments
COMMENT ON COLUMN public.payments.is_split_payment IS 'Indicates if this payment is part of a split payment (multiple cards for one order)';
COMMENT ON COLUMN public.payments.split_payment_index IS 'For split payments, indicates the sequence (1 for first card, 2 for second)';
COMMENT ON COLUMN public.payments.payment_method_id IS 'Stripe or Moov payment method ID used for this payment';

-- Create view for split payment summaries
CREATE OR REPLACE VIEW public.split_payments_view AS
SELECT 
  p1.order_id,
  COUNT(p1.id) as payment_count,
  SUM(p1.amount_cents) as total_amount_cents,
  json_agg(
    json_build_object(
      'payment_id', p1.id,
      'amount_cents', p1.amount_cents,
      'status', p1.status,
      'split_index', p1.split_payment_index,
      'payment_method_id', p1.payment_method_id,
      'created_at', p1.created_at
    ) ORDER BY p1.split_payment_index
  ) as payments
FROM 
  public.payments p1
WHERE 
  p1.is_split_payment = TRUE
GROUP BY 
  p1.order_id;

COMMENT ON VIEW public.split_payments_view IS 'Aggregated view of split payments showing all card charges for each order';

