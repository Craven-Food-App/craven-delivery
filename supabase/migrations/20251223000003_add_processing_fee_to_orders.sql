-- Track per-order processing fee charged to the customer

alter table public.orders
  add column if not exists processing_fee_cents integer default 0;

comment on column public.orders.processing_fee_cents is
  'Processing fee (e.g., Moov processing) charged to the customer for this order, in cents.';


