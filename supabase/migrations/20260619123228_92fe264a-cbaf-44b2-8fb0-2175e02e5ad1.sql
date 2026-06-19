
-- =========================================================
-- Crave'N Express (CX) foundation
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.cx_job_type AS ENUM ('on_demand','scheduled','bulk_route');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cx_job_status AS ENUM (
    'draft','posted','offered','accepted',
    'en_route_pickup','picked_up','en_route_dropoff',
    'delivered','cancelled','failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend existing tables
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'restaurant';

ALTER TABLE public.driver_preferences
  ADD COLUMN IF NOT EXISTS cx_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cx_tier_verified boolean NOT NULL DEFAULT false;

-- =========================================================
-- Helper: is current user linked to a courier restaurant?
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_owns_courier_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = _restaurant_id
      AND r.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.restaurant_users ru
    WHERE ru.restaurant_id = _restaurant_id
      AND ru.user_id = _user_id
  );
$$;

-- Admin check helper (uses existing exec_users + user_roles patterns)
CREATE OR REPLACE FUNCTION public.is_cx_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','founder'));
$$;

-- =========================================================
-- cx_jobs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cx_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  job_type public.cx_job_type NOT NULL,
  status public.cx_job_status NOT NULL DEFAULT 'draft',
  pickup_at timestamptz,
  driver_payout_offer_cents integer NOT NULL CHECK (driver_payout_offer_cents >= 0),
  platform_base_cents integer NOT NULL CHECK (platform_base_cents >= 0),
  total_charge_cents integer GENERATED ALWAYS AS (driver_payout_offer_cents + platform_base_cents) STORED,
  assigned_driver_id uuid,
  region_id uuid,
  notes text,
  optimized_polyline text,
  estimated_distance_meters integer,
  estimated_duration_seconds integer,
  dispatch_deadline_at timestamptz,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cx_jobs_courier ON public.cx_jobs(courier_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_cx_jobs_driver ON public.cx_jobs(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_cx_jobs_status ON public.cx_jobs(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_jobs TO authenticated;
GRANT ALL ON public.cx_jobs TO service_role;

ALTER TABLE public.cx_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers view own jobs"
  ON public.cx_jobs FOR SELECT TO authenticated
  USING (public.user_owns_courier_restaurant(auth.uid(), courier_restaurant_id));

CREATE POLICY "Drivers view assigned/offered jobs"
  ON public.cx_jobs FOR SELECT TO authenticated
  USING (assigned_driver_id = auth.uid() OR status = 'posted');

CREATE POLICY "Admins view all jobs"
  ON public.cx_jobs FOR SELECT TO authenticated
  USING (public.is_cx_admin(auth.uid()));

CREATE POLICY "Couriers insert own jobs"
  ON public.cx_jobs FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_owns_courier_restaurant(auth.uid(), courier_restaurant_id)
  );

CREATE POLICY "Couriers update own jobs"
  ON public.cx_jobs FOR UPDATE TO authenticated
  USING (public.user_owns_courier_restaurant(auth.uid(), courier_restaurant_id))
  WITH CHECK (public.user_owns_courier_restaurant(auth.uid(), courier_restaurant_id));

CREATE POLICY "Drivers update assigned jobs"
  ON public.cx_jobs FOR UPDATE TO authenticated
  USING (assigned_driver_id = auth.uid())
  WITH CHECK (assigned_driver_id = auth.uid());

CREATE POLICY "Admins manage all jobs"
  ON public.cx_jobs FOR ALL TO authenticated
  USING (public.is_cx_admin(auth.uid()))
  WITH CHECK (public.is_cx_admin(auth.uid()));

-- =========================================================
-- cx_job_stops
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cx_job_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.cx_jobs(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  stop_type text NOT NULL CHECK (stop_type IN ('pickup','dropoff')),
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  contact_name text,
  contact_phone text,
  package_description text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cx_job_stops_job ON public.cx_job_stops(job_id, sequence);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_job_stops TO authenticated;
GRANT ALL ON public.cx_job_stops TO service_role;

ALTER TABLE public.cx_job_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View stops if can view job"
  ON public.cx_job_stops FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id
      AND (
        public.user_owns_courier_restaurant(auth.uid(), j.courier_restaurant_id)
        OR j.assigned_driver_id = auth.uid()
        OR public.is_cx_admin(auth.uid())
      )
  ));

CREATE POLICY "Couriers manage own stops"
  ON public.cx_job_stops FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id
      AND public.user_owns_courier_restaurant(auth.uid(), j.courier_restaurant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id
      AND public.user_owns_courier_restaurant(auth.uid(), j.courier_restaurant_id)
  ));

CREATE POLICY "Drivers complete stops"
  ON public.cx_job_stops FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id AND j.assigned_driver_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id AND j.assigned_driver_id = auth.uid()
  ));

CREATE POLICY "Admins manage all stops"
  ON public.cx_job_stops FOR ALL TO authenticated
  USING (public.is_cx_admin(auth.uid()))
  WITH CHECK (public.is_cx_admin(auth.uid()));

-- =========================================================
-- cx_job_events
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cx_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.cx_jobs(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cx_job_events_job ON public.cx_job_events(job_id, created_at);

GRANT SELECT, INSERT ON public.cx_job_events TO authenticated;
GRANT ALL ON public.cx_job_events TO service_role;

ALTER TABLE public.cx_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View events if can view job"
  ON public.cx_job_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cx_jobs j WHERE j.id = job_id
      AND (
        public.user_owns_courier_restaurant(auth.uid(), j.courier_restaurant_id)
        OR j.assigned_driver_id = auth.uid()
        OR public.is_cx_admin(auth.uid())
      )
  ));

CREATE POLICY "Insert events as self"
  ON public.cx_job_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_cx_admin(auth.uid()));

-- =========================================================
-- cx_pricing_config
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cx_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid,
  job_type public.cx_job_type NOT NULL,
  platform_base_cents integer NOT NULL CHECK (platform_base_cents >= 0),
  minimum_driver_payout_cents integer NOT NULL CHECK (minimum_driver_payout_cents >= 0),
  per_mile_floor_cents integer NOT NULL DEFAULT 0,
  per_stop_floor_cents integer NOT NULL DEFAULT 0,
  dispatch_timeout_seconds integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cx_pricing_config TO authenticated;
GRANT ALL ON public.cx_pricing_config TO service_role;

ALTER TABLE public.cx_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view active pricing"
  ON public.cx_pricing_config FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admins manage pricing"
  ON public.cx_pricing_config FOR ALL TO authenticated
  USING (public.is_cx_admin(auth.uid()))
  WITH CHECK (public.is_cx_admin(auth.uid()));

-- Seed default pricing rows
INSERT INTO public.cx_pricing_config (job_type, platform_base_cents, minimum_driver_payout_cents, per_mile_floor_cents, per_stop_floor_cents, dispatch_timeout_seconds)
VALUES
  ('on_demand', 299, 500, 100, 0, 60),
  ('scheduled', 399, 500, 100, 0, 120),
  ('bulk_route', 499, 1500, 100, 150, 180)
ON CONFLICT DO NOTHING;

-- =========================================================
-- cx_driver_verification
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cx_driver_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  insurance_doc_url text,
  insurance_expires_on date,
  vehicle_class text,
  max_package_size text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_driver_verification TO authenticated;
GRANT ALL ON public.cx_driver_verification TO service_role;

ALTER TABLE public.cx_driver_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own verification"
  ON public.cx_driver_verification FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.is_cx_admin(auth.uid()));

CREATE POLICY "Drivers manage own verification"
  ON public.cx_driver_verification FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers update own verification"
  ON public.cx_driver_verification FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage verification"
  ON public.cx_driver_verification FOR ALL TO authenticated
  USING (public.is_cx_admin(auth.uid()))
  WITH CHECK (public.is_cx_admin(auth.uid()));

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.cx_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_cx_jobs_updated ON public.cx_jobs;
CREATE TRIGGER trg_cx_jobs_updated BEFORE UPDATE ON public.cx_jobs
  FOR EACH ROW EXECUTE FUNCTION public.cx_set_updated_at();

DROP TRIGGER IF EXISTS trg_cx_pricing_updated ON public.cx_pricing_config;
CREATE TRIGGER trg_cx_pricing_updated BEFORE UPDATE ON public.cx_pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.cx_set_updated_at();

DROP TRIGGER IF EXISTS trg_cx_driver_verif_updated ON public.cx_driver_verification;
CREATE TRIGGER trg_cx_driver_verif_updated BEFORE UPDATE ON public.cx_driver_verification
  FOR EACH ROW EXECUTE FUNCTION public.cx_set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cx_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cx_job_events;
