
-- =========================================================
-- 1. Extend orders with geo + proof columns
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lat numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lng numeric,
  ADD COLUMN IF NOT EXISTS pickup_photo_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_photo_lng numeric,
  ADD COLUMN IF NOT EXISTS delivery_photo_url text,
  ADD COLUMN IF NOT EXISTS delivery_photo_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_photo_lat numeric,
  ADD COLUMN IF NOT EXISTS delivery_photo_lng numeric,
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_distance_traveled_m integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_route_count integer DEFAULT 0;

-- =========================================================
-- 2. order_tracking_events  (immutable audit log)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid,
  actor_user_id uuid,
  actor_role text,
  event_type text NOT NULL,
  lat numeric,
  lng numeric,
  accuracy_m numeric,
  heading numeric,
  speed_mps numeric,
  distance_to_target_m numeric,
  photo_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order ON public.order_tracking_events(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_event_type ON public.order_tracking_events(event_type);

GRANT SELECT, INSERT ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. order_location_breadcrumbs  (high-frequency GPS trail)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.order_location_breadcrumbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  accuracy_m numeric,
  heading numeric,
  speed_mps numeric,
  distance_from_route_m numeric,
  distance_to_dropoff_m numeric,
  is_off_route boolean DEFAULT false,
  stage text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_breadcrumbs_order ON public.order_location_breadcrumbs(order_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_order_breadcrumbs_driver ON public.order_location_breadcrumbs(driver_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.order_location_breadcrumbs TO authenticated;
GRANT ALL ON public.order_location_breadcrumbs TO service_role;
ALTER TABLE public.order_location_breadcrumbs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. order_route_deviations  (off-route incidents)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.order_route_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  max_distance_from_route_m numeric,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  resolved boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_deviations_order ON public.order_route_deviations(order_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.order_route_deviations TO authenticated;
GRANT ALL ON public.order_route_deviations TO service_role;
ALTER TABLE public.order_route_deviations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. Helper: is_order_admin (security definer, avoids recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_order_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exec_users WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','founder','ceo','coo','cpo','cfo','support')
  );
$$;

-- =========================================================
-- 6. RLS Policies
-- =========================================================

-- tracking events
DROP POLICY IF EXISTS "tracking_events_admin_read" ON public.order_tracking_events;
CREATE POLICY "tracking_events_admin_read" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (public.is_order_admin(auth.uid()));

DROP POLICY IF EXISTS "tracking_events_party_read" ON public.order_tracking_events;
CREATE POLICY "tracking_events_party_read" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_tracking_events.order_id
        AND (o.customer_id = auth.uid()
          OR o.driver_id = auth.uid()
          OR o.accepted_driver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_events_driver_insert" ON public.order_tracking_events;
CREATE POLICY "tracking_events_driver_insert" ON public.order_tracking_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      public.is_order_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_tracking_events.order_id
          AND (o.driver_id = auth.uid()
            OR o.accepted_driver_id = auth.uid()
            OR o.customer_id = auth.uid())
      )
    )
  );

-- breadcrumbs
DROP POLICY IF EXISTS "breadcrumbs_admin_read" ON public.order_location_breadcrumbs;
CREATE POLICY "breadcrumbs_admin_read" ON public.order_location_breadcrumbs
  FOR SELECT TO authenticated
  USING (public.is_order_admin(auth.uid()));

DROP POLICY IF EXISTS "breadcrumbs_driver_read_own" ON public.order_location_breadcrumbs;
CREATE POLICY "breadcrumbs_driver_read_own" ON public.order_location_breadcrumbs
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "breadcrumbs_driver_insert" ON public.order_location_breadcrumbs;
CREATE POLICY "breadcrumbs_driver_insert" ON public.order_location_breadcrumbs
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- deviations
DROP POLICY IF EXISTS "deviations_admin_all" ON public.order_route_deviations;
CREATE POLICY "deviations_admin_all" ON public.order_route_deviations
  FOR ALL TO authenticated
  USING (public.is_order_admin(auth.uid()))
  WITH CHECK (public.is_order_admin(auth.uid()));

DROP POLICY IF EXISTS "deviations_driver_insert" ON public.order_route_deviations;
CREATE POLICY "deviations_driver_insert" ON public.order_route_deviations
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "deviations_driver_update_own" ON public.order_route_deviations;
CREATE POLICY "deviations_driver_update_own" ON public.order_route_deviations
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "deviations_driver_read_own" ON public.order_route_deviations;
CREATE POLICY "deviations_driver_read_own" ON public.order_route_deviations
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
