-- ============================================================================
-- Crave'n Marketplace Seeding System
-- 3-tier catalog: ACTIVE (real merchants), REQUESTABLE, COMING_SOON
-- ============================================================================

-- restaurants_master: catalog of all visible restaurants (active + prospect)
CREATE TABLE IF NOT EXISTS public.restaurants_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  address text,
  lat numeric,
  lng numeric,
  category text,
  status text NOT NULL DEFAULT 'REQUESTABLE' CHECK (status IN ('ACTIVE', 'REQUESTABLE', 'COMING_SOON', 'LEAD_READY')),
  request_count integer NOT NULL DEFAULT 0,
  last_requested_at timestamptz,
  -- Link to live merchant when status = ACTIVE (optional; active can also come from restaurants table)
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  -- Images for clean/official UI
  image_url text,
  logo_url text,
  header_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_master_status ON public.restaurants_master(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_master_category ON public.restaurants_master(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_master_request_count ON public.restaurants_master(request_count DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_master_city ON public.restaurants_master(city);

COMMENT ON TABLE public.restaurants_master IS 'Marketplace catalog: ACTIVE (live), REQUESTABLE (request flow), COMING_SOON (notify me), LEAD_READY (for merchant outreach).';

-- Notify me when available (COMING_SOON signups)
CREATE TABLE IF NOT EXISTS public.restaurant_notify_me (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_master_id uuid NOT NULL REFERENCES public.restaurants_master(id) ON DELETE CASCADE,
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notify_me_restaurant_user ON public.restaurant_notify_me(restaurant_master_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notify_me_restaurant_email ON public.restaurant_notify_me(restaurant_master_id, email) WHERE email IS NOT NULL AND TRIM(email) != '';

CREATE INDEX IF NOT EXISTS idx_restaurant_notify_me_master ON public.restaurant_notify_me(restaurant_master_id);

-- RLS: anyone can read restaurants_master (public catalog)
ALTER TABLE public.restaurants_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_master_select" ON public.restaurants_master FOR SELECT USING (true);

-- Only service role / backend can insert/update (request_count via RPC)
CREATE POLICY "restaurants_master_all_service" ON public.restaurants_master FOR ALL USING (false) WITH CHECK (false);

-- Notify me: allow insert for authenticated or anonymous (email)
ALTER TABLE public.restaurant_notify_me ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_notify_me_insert" ON public.restaurant_notify_me FOR INSERT WITH CHECK (true);
CREATE POLICY "restaurant_notify_me_select_own" ON public.restaurant_notify_me FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Grant service role full access (bypasses RLS)
GRANT ALL ON public.restaurants_master TO service_role;
GRANT ALL ON public.restaurant_notify_me TO service_role;
GRANT SELECT ON public.restaurants_master TO anon, authenticated;

-- Trigger: set LEAD_READY when request_count >= 15
CREATE OR REPLACE FUNCTION public.set_lead_ready_on_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_count >= 15 AND (OLD.request_count IS NULL OR OLD.request_count < 15) AND NEW.status = 'REQUESTABLE' THEN
    NEW.status := 'LEAD_READY';
    NEW.updated_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restaurants_master_lead_ready ON public.restaurants_master;
CREATE TRIGGER trg_restaurants_master_lead_ready
  BEFORE UPDATE ON public.restaurants_master
  FOR EACH ROW
  WHEN (OLD.request_count IS DISTINCT FROM NEW.request_count)
  EXECUTE PROCEDURE public.set_lead_ready_on_request();

-- RPC: Increment request count (called from consumer app; uses service_role or a secure wrapper)
CREATE OR REPLACE FUNCTION public.request_restaurant(p_restaurant_master_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.restaurants_master
  SET request_count = request_count + 1,
      last_requested_at = now(),
      updated_at = now()
  WHERE id = p_restaurant_master_id
    AND status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant not found or not requestable');
  END IF;
  SELECT request_count INTO v_count FROM public.restaurants_master WHERE id = p_restaurant_master_id;
  RETURN jsonb_build_object('ok', true, 'request_count', v_count);
END;
$$;

-- RPC: Notify me when available
CREATE OR REPLACE FUNCTION public.notify_me_restaurant(p_restaurant_master_id uuid, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_master_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurants_master WHERE id = p_restaurant_master_id AND status = 'COMING_SOON') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant not coming soon');
  END IF;
  INSERT INTO public.restaurant_notify_me (restaurant_master_id, email, user_id)
  VALUES (p_restaurant_master_id, NULLIF(TRIM(p_email), ''), auth.uid())
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', true, 'message', 'Already signed up');
END;
$$;

-- RPC: Get unified marketplace catalog (active from restaurants + requestable/coming_soon from restaurants_master)
-- Returns one row per place with: id, name, status, image_url, cuisine_type, lat, lng, etc.
CREATE OR REPLACE FUNCTION public.get_marketplace_restaurants(
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_cuisine text DEFAULT NULL,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  image_url text,
  header_image_url text,
  cuisine_type text,
  city text,
  state text,
  lat numeric,
  lng numeric,
  rating numeric,
  min_delivery_time int,
  max_delivery_time int,
  delivery_fee_cents int,
  is_promoted boolean,
  request_count int,
  description text,
  delivery_radius_miles numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    catalog.id,
    catalog.name,
    catalog.status,
    catalog.image_url,
    catalog.header_image_url,
    catalog.cuisine_type,
    catalog.city,
    catalog.state,
    catalog.lat,
    catalog.lng,
    catalog.rating,
    catalog.min_delivery_time,
    catalog.max_delivery_time,
    catalog.delivery_fee_cents,
    catalog.is_promoted,
    catalog.request_count,
    catalog.description,
    catalog.delivery_radius_miles
  FROM (
    -- Active merchants from restaurants
    SELECT
      r.id,
      r.name,
      'ACTIVE'::text AS status,
      r.image_url,
      r.header_image_url,
      r.cuisine_type,
      r.city,
      r.state,
      r.latitude::numeric AS lat,
      r.longitude::numeric AS lng,
      r.rating,
      r.min_delivery_time::int,
      r.max_delivery_time::int,
      r.delivery_fee_cents,
      COALESCE(r.is_promoted, false) AS is_promoted,
      NULL::int AS request_count,
      r.description,
      r.delivery_radius_miles
    FROM public.restaurants r
    WHERE r.is_active = true
      AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR r.cuisine_type ILIKE '%' || p_cuisine || '%')

    UNION ALL

    -- Requestable & Coming Soon from restaurants_master
    SELECT
      m.id,
      m.name,
      CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END AS status,
      COALESCE(m.image_url, m.logo_url) AS image_url,
      m.header_image_url,
      m.category AS cuisine_type,
      m.city,
      m.state,
      m.lat,
      m.lng,
      NULL::numeric AS rating,
      NULL::int AS min_delivery_time,
      NULL::int AS max_delivery_time,
      NULL::int AS delivery_fee_cents,
      false AS is_promoted,
      m.request_count,
      NULL::text AS description,
      NULL::numeric AS delivery_radius_miles
    FROM public.restaurants_master m
    WHERE m.status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR m.category ILIKE '%' || p_cuisine || '%')
  ) AS catalog
  ORDER BY (CASE WHEN catalog.status = 'ACTIVE' THEN 0 WHEN catalog.status = 'COMING_SOON' THEN 1 ELSE 2 END), catalog.name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_restaurant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_me_restaurant(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_restaurants(numeric, numeric, text, text, int) TO anon, authenticated;
