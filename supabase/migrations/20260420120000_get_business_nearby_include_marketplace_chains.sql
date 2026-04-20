-- ============================================================================
-- Align get_business_nearby with get_marketplace_restaurants: include
-- marketplace_chains (national retail / convenience / pet / mall pins with
-- point_near_center) so "Retail Stores Near You" is not empty when the only
-- retail rows are synthetic chain locations.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_business_nearby(numeric, numeric, numeric, text, text, integer);

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
  address text,
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
           (TRIM(COALESCE(r.address, '') || COALESCE(', ' || NULLIF(TRIM(r.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(r.state), ''), '')))::text AS address,
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
           m.category, m.city, m.state,
           (TRIM(COALESCE(m.address, '') || COALESCE(', ' || NULLIF(TRIM(m.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(m.state), ''), '')))::text AS address,
           m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, m.request_count, NULL::text, NULL::numeric, m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('ACTIVE', 'REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND m.lat IS NOT NULL AND m.lng IS NOT NULL
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
    UNION ALL
    SELECT c.id, c.name, 'REQUESTABLE'::text,
           c.marketplace_type, c.logo_url, NULL::text, c.logo_url,
           c.category, NULL::text, NULL::text,
           NULL::text,
           (SELECT pt.out_lat FROM public.point_near_center(p_lat, p_lng, c.id::text, LEAST(p_radius_miles, 28)) pt),
           (SELECT pt.out_lng FROM public.point_near_center(p_lat, p_lng, c.id::text, LEAST(p_radius_miles, 28)) pt),
           NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, NULL::int, NULL::text, NULL::numeric, NULL::text
    FROM public.marketplace_chains c
    WHERE p_lat IS NOT NULL AND p_lng IS NOT NULL
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR c.marketplace_type = p_marketplace_type)
      AND (p_search IS NULL OR p_search = '' OR c.name ILIKE '%' || p_search || '%' OR c.category ILIKE '%' || p_search || '%')
  ),
  with_dist AS (
    SELECT c.*,
           (public.calculate_distance(p_lat::numeric, p_lng::numeric, c.lat, c.lng) * 0.621371) AS dist_mi
    FROM catalog c
  )
  SELECT w.id, w.name, w.status, w.marketplace_type, w.image_url, w.header_image_url, w.logo_url,
         w.cuisine_type, w.city, w.state, w.address,
         w.lat, w.lng, w.rating, w.min_delivery_time, w.max_delivery_time,
         w.delivery_fee_cents, w.is_promoted, w.request_count, w.description, w.delivery_radius_miles,
         w.parent_location, w.dist_mi AS distance_miles
  FROM with_dist w
  WHERE (p_lat IS NULL AND p_lng IS NULL) OR (w.dist_mi <= p_radius_miles)
    AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR w.marketplace_type = p_marketplace_type)
  ORDER BY (CASE WHEN w.status = 'ACTIVE' THEN 0 WHEN w.status = 'COMING_SOON' THEN 1 ELSE 2 END), w.dist_mi NULLS LAST, w.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_business_nearby(numeric, numeric, numeric, text, text, integer) IS
  'Nearby businesses within radius (miles). Catalog matches get_marketplace_restaurants: restaurants, restaurants_master, and marketplace_chains (synthetic pins).';

GRANT EXECUTE ON FUNCTION public.get_business_nearby(numeric, numeric, numeric, text, text, integer) TO anon, authenticated;
