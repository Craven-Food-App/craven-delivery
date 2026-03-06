-- ============================================================================
-- Marketplace extension: marketplace_type, subcategory, parent_location,
-- get_business_nearby (location + radius), lead threshold 20
-- ============================================================================

-- 1. Add new columns to restaurants_master (if not exists)
ALTER TABLE public.restaurants_master
  ADD COLUMN IF NOT EXISTS marketplace_type text DEFAULT 'restaurant' CHECK (marketplace_type IN ('restaurant', 'retail', 'mall')),
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS parent_location text;

COMMENT ON COLUMN public.restaurants_master.marketplace_type IS 'restaurant | retail | mall';
COMMENT ON COLUMN public.restaurants_master.parent_location IS 'Mall or parent location name for stores inside malls';

CREATE INDEX IF NOT EXISTS idx_restaurants_master_marketplace_type ON public.restaurants_master(marketplace_type);

-- 2. Lead-ready threshold: 20 requests (was 15)
CREATE OR REPLACE FUNCTION public.set_lead_ready_on_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_count >= 20 AND (OLD.request_count IS NULL OR OLD.request_count < 20) AND NEW.status = 'REQUESTABLE' THEN
    NEW.status := 'LEAD_READY';
    NEW.updated_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. get_business_nearby: location-based nearby with radius (miles). Uses same catalog as get_marketplace_restaurants + distance filter.
-- Distance via existing calculate_distance (km) * 0.621371 = miles.
CREATE OR REPLACE FUNCTION public.get_business_nearby(
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_radius_miles numeric DEFAULT 10,
  p_marketplace_type text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  marketplace_type text,
  image_url text,
  header_image_url text,
  logo_url text,
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
  delivery_radius_miles numeric,
  parent_location text,
  distance_miles numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH catalog AS (
    SELECT r.id, r.name, 'ACTIVE'::text AS status, 'restaurant'::text AS marketplace_type,
           r.image_url, r.header_image_url, r.logo_url, r.cuisine_type, r.city, r.state,
           r.latitude::numeric AS lat, r.longitude::numeric AS lng, r.rating,
           r.min_delivery_time::int, r.max_delivery_time::int, r.delivery_fee_cents,
           COALESCE(r.is_promoted, false) AS is_promoted, NULL::int AS request_count,
           r.description, r.delivery_radius_miles, NULL::text AS parent_location
    FROM public.restaurants r
    WHERE r.is_active = true
      AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
      AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%')
    UNION ALL
    SELECT m.id, m.name, CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END,
           COALESCE(m.marketplace_type, 'restaurant'), COALESCE(m.image_url, m.logo_url), m.header_image_url, m.logo_url,
           m.category, m.city, m.state, m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, m.request_count, NULL::text, NULL::numeric, m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND m.lat IS NOT NULL AND m.lng IS NOT NULL
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
  ),
  with_dist AS (
    SELECT c.*,
           (public.calculate_distance(p_lat::numeric, p_lng::numeric, c.lat, c.lng) * 0.621371) AS dist_mi
    FROM catalog c
  )
  SELECT w.id, w.name, w.status, w.marketplace_type, w.image_url, w.header_image_url, w.logo_url,
         w.cuisine_type, w.city, w.state, w.lat, w.lng, w.rating, w.min_delivery_time, w.max_delivery_time,
         w.delivery_fee_cents, w.is_promoted, w.request_count, w.description, w.delivery_radius_miles,
         w.parent_location, w.dist_mi AS distance_miles
  FROM with_dist w
  WHERE (p_lat IS NULL AND p_lng IS NULL) OR (w.dist_mi <= p_radius_miles)
    AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR w.marketplace_type = p_marketplace_type)
  ORDER BY (CASE WHEN w.status = 'ACTIVE' THEN 0 WHEN w.status = 'COMING_SOON' THEN 1 ELSE 2 END), w.dist_mi NULLS LAST, w.name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_nearby(numeric, numeric, numeric, text, text, int) TO anon, authenticated;

-- 4. Extend get_marketplace_restaurants to return marketplace_type and parent_location for consumer/feeder
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
  marketplace_type text,
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
  delivery_radius_miles numeric,
  parent_location text
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
    catalog.marketplace_type,
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
    catalog.delivery_radius_miles,
    catalog.parent_location
  FROM (
    SELECT r.id, r.name, 'ACTIVE'::text AS status, 'restaurant'::text AS marketplace_type,
           r.image_url, r.header_image_url, r.cuisine_type, r.city, r.state,
           r.latitude::numeric AS lat, r.longitude::numeric AS lng, r.rating,
           r.min_delivery_time::int, r.max_delivery_time::int, r.delivery_fee_cents,
           COALESCE(r.is_promoted, false) AS is_promoted, NULL::int AS request_count,
           r.description, r.delivery_radius_miles, NULL::text AS parent_location
    FROM public.restaurants r
    WHERE r.is_active = true
      AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR r.cuisine_type ILIKE '%' || p_cuisine || '%')
    UNION ALL
    SELECT m.id, m.name, CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END,
           COALESCE(m.marketplace_type, 'restaurant'), COALESCE(m.image_url, m.logo_url), m.header_image_url,
           m.category, m.city, m.state, m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, m.request_count, NULL::text, NULL::numeric, m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR m.category ILIKE '%' || p_cuisine || '%')
  ) AS catalog
  ORDER BY (CASE WHEN catalog.status = 'ACTIVE' THEN 0 WHEN catalog.status = 'COMING_SOON' THEN 1 ELSE 2 END), catalog.name
  LIMIT p_limit;
END;
$$;
