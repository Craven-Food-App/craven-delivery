
ALTER TABLE public.cx_jobs ALTER COLUMN courier_restaurant_id DROP NOT NULL;
ALTER TABLE public.cx_jobs ALTER COLUMN driver_payout_offer_cents DROP NOT NULL;
ALTER TABLE public.cx_jobs ALTER COLUMN platform_base_cents DROP NOT NULL;
