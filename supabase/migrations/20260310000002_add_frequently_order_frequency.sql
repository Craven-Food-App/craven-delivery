-- Allow 'frequently' as an order_frequency option for partnership requests
ALTER TABLE public.merchant_partnership_requests
  DROP CONSTRAINT IF EXISTS merchant_partnership_requests_order_frequency_check;

ALTER TABLE public.merchant_partnership_requests
  ADD CONSTRAINT merchant_partnership_requests_order_frequency_check
  CHECK (order_frequency IN ('frequently', 'weekly', '2_3_per_month', 'monthly', 'rarely'));
