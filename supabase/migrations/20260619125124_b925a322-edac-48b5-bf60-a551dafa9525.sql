-- =========================================================
-- driver_vehicles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  color text,
  license_plate text,
  plate_state text,
  vehicle_type text NOT NULL DEFAULT 'car',
  is_active boolean NOT NULL DEFAULT false,
  insurance_doc_url text,
  insurance_expiration date,
  registration_doc_url text,
  registration_expiration date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_user ON public.driver_vehicles(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_vehicles TO authenticated;
GRANT ALL ON public.driver_vehicles TO service_role;

ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own vehicles"
  ON public.driver_vehicles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only one active vehicle per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_vehicles_one_active
  ON public.driver_vehicles(user_id) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_vehicles_updated ON public.driver_vehicles;
CREATE TRIGGER trg_driver_vehicles_updated
  BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- driver_licenses
-- =========================================================
CREATE TABLE IF NOT EXISTS public.driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number text,
  license_state text,
  expiration_date date,
  front_image_url text,
  back_image_url text,
  selfie_image_url text,
  verified boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_licenses TO authenticated;
GRANT ALL ON public.driver_licenses TO service_role;

ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own license"
  ON public.driver_licenses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_driver_licenses_updated ON public.driver_licenses;
CREATE TRIGGER trg_driver_licenses_updated
  BEFORE UPDATE ON public.driver_licenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();