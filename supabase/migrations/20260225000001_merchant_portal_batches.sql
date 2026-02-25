-- Batch A: Store status (open/pause/close) + temporary pause
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS store_status text NOT NULL DEFAULT 'open'
    CHECK (store_status IN ('open', 'paused', 'closed'));
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS paused_until timestamp with time zone;

COMMENT ON COLUMN public.restaurants.store_status IS 'Merchant-controlled: open (accept orders), paused (temp), closed (not accepting)';
COMMENT ON COLUMN public.restaurants.paused_until IS 'When set with store_status=paused, auto-switch back to open after this time';

-- Backfill: existing is_active false => store_status closed; is_active true => open
UPDATE public.restaurants
SET store_status = CASE WHEN is_active = true THEN 'open' ELSE 'closed' END
WHERE store_status IS NULL OR (store_status = 'open' AND is_active = false);

-- Batch C: Merchant-scoped promos (nullable = platform-wide)
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_promo_codes_restaurant_id ON public.promo_codes (restaurant_id);

-- RLS: merchants can manage their own restaurant's promos
CREATE POLICY "Merchant can manage own restaurant promos"
ON public.promo_codes FOR ALL
TO authenticated
USING (
  restaurant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = promo_codes.restaurant_id AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = promo_codes.restaurant_id AND r.owner_id = auth.uid()
  )
);

-- Batch D: Merchant activity / audit log
CREATE TABLE IF NOT EXISTS public.merchant_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_activity_restaurant_created
  ON public.merchant_activity_log (restaurant_id, created_at DESC);

ALTER TABLE public.merchant_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant can view own activity log"
ON public.merchant_activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = merchant_activity_log.restaurant_id AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Merchant can insert own activity log"
ON public.merchant_activity_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = merchant_activity_log.restaurant_id AND r.owner_id = auth.uid()
  )
);
