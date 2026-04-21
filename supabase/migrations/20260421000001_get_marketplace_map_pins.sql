-- ============================================================================
-- Map-only RPC: real merchant pins at real geolocations.
--
-- get_marketplace_restaurants / get_business_nearby intentionally invent
-- synthetic locations for public.marketplace_chains via point_near_center
-- (so a "nearby" list always has Burger King / 7-Eleven / etc.). That is fine
-- for a scrolling list but it is WRONG for the customer merchant map — pins
-- for those rows land at hashed-random offsets 2–29 miles from the customer
-- and don't sit on the real storefront.
--
-- This RPC returns only rows whose lat/lng come from real data:
--   1. public.restaurants      (onboarded merchants, real lat/lng)
--   2. public.restaurants_master (seeded directory, curated lat/lng)
-- Rows with NULL lat/lng are excluded. marketplace_chains is NOT unioned in.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_marketplace_map_pins(numeric, numeric, numeric, text, integer);

CREATE OR REPLACE FUNCTION public.get_marketplace_map_pins(
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_radius_miles numeric DEFAULT 30,
  p_marketplace_type text DEFAULT NULL,
  p_limit int DEFAULT 1500
)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  marketplace_type text,
  image_url text,
  logo_url text,
  cuisine_type text,
  city text,
  state text,
  address text,
  lat numeric,
  lng numeric,
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
    -- Onboarded merchants (real lat/lng from geocoded onboarding)
    SELECT
      r.id,
      r.name,
      'ACTIVE'::text AS status,
      public.restaurants_row_marketplace_type(r.merchant_category, r.cuisine_type, r.restaurant_type) AS marketplace_type,
      r.image_url,
      r.logo_url,
      r.cuisine_type,
      r.city,
      r.state,
      NULLIF(TRIM(COALESCE(r.address, '') || COALESCE(', ' || NULLIF(TRIM(r.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(r.state), ''), '')), '')::text AS address,
      r.latitude::numeric AS lat,
      r.longitude::numeric AS lng,
      NULL::text AS parent_location
    FROM public.restaurants r
    WHERE r.is_active = true
      AND r.latitude IS NOT NULL
      AND r.longitude IS NOT NULL
      AND (
        p_marketplace_type IS NULL
        OR p_marketplace_type = ''
        OR public.restaurants_row_marketplace_type(r.merchant_category, r.cuisine_type, r.restaurant_type) = p_marketplace_type
      )

    UNION ALL

    -- Seeded directory (real curated lat/lng + addresses)
    SELECT
      m.id,
      m.name,
      CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END,
      COALESCE(m.marketplace_type, 'restaurant'),
      COALESCE(m.image_url, m.logo_url),
      m.logo_url,
      m.category,
      m.city,
      m.state,
      NULLIF(TRIM(COALESCE(m.address, '') || COALESCE(', ' || NULLIF(TRIM(m.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(m.state), ''), '')), '')::text AS address,
      m.lat,
      m.lng,
      m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('ACTIVE', 'REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND m.lat IS NOT NULL
      AND m.lng IS NOT NULL
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR COALESCE(m.marketplace_type, 'restaurant') = p_marketplace_type)
  ),
  with_dist AS (
    SELECT
      c.*,
      CASE
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL
        THEN (public.calculate_distance(p_lat::numeric, p_lng::numeric, c.lat, c.lng) * 0.621371)
        ELSE NULL
      END AS dist_mi
    FROM catalog c
  )
  SELECT
    w.id, w.name, w.status, w.marketplace_type, w.image_url, w.logo_url,
    w.cuisine_type, w.city, w.state, w.address, w.lat, w.lng,
    w.parent_location, w.dist_mi AS distance_miles
  FROM with_dist w
  WHERE (p_lat IS NULL AND p_lng IS NULL) OR (w.dist_mi IS NOT NULL AND w.dist_mi <= p_radius_miles)
  ORDER BY
    (CASE WHEN w.status = 'ACTIVE' THEN 0 WHEN w.status = 'COMING_SOON' THEN 1 ELSE 2 END),
    w.dist_mi NULLS LAST,
    w.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_marketplace_map_pins(numeric, numeric, numeric, text, integer) IS
  'Real-location merchant pins for the customer map. Unions restaurants + restaurants_master with non-null lat/lng; does NOT include synthetic marketplace_chains.';

GRANT EXECUTE ON FUNCTION public.get_marketplace_map_pins(numeric, numeric, numeric, text, integer) TO anon, authenticated;
