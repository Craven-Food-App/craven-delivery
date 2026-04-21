-- ============================================================================
-- Broaden map pin coverage nationwide using existing marketplace_chains data.
--
-- Why:
-- - Real storefront coordinates (restaurants + restaurants_master) are still
--   densest in Ohio right now.
-- - Outside those regions, the map can look sparse/empty even when we have
--   national chain discovery rows available.
--
-- What:
-- - Keep real storefront pins as priority.
-- - Auto-supplement with synthetic local chain pins (point_near_center) when
--   real-pin coverage in the selected radius is low.
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
  WITH real_catalog AS (
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
  real_with_dist AS (
    SELECT
      c.*,
      CASE
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL
        THEN (public.calculate_distance(p_lat::numeric, p_lng::numeric, c.lat, c.lng) * 0.621371)
        ELSE NULL
      END AS dist_mi
    FROM real_catalog c
  ),
  real_filtered AS (
    SELECT *
    FROM real_with_dist rw
    WHERE (p_lat IS NULL AND p_lng IS NULL) OR (rw.dist_mi IS NOT NULL AND rw.dist_mi <= p_radius_miles)
  ),
  real_count AS (
    SELECT COUNT(*)::int AS cnt
    FROM real_filtered
  ),
  chain_catalog AS (
    SELECT
      c.id,
      c.name,
      'REQUESTABLE'::text AS status,
      c.marketplace_type,
      c.logo_url AS image_url,
      c.logo_url,
      c.category AS cuisine_type,
      NULL::text AS city,
      NULL::text AS state,
      NULL::text AS address,
      (SELECT pt.out_lat FROM public.point_near_center(p_lat, p_lng, c.id::text, LEAST(p_radius_miles, 28)) pt) AS lat,
      (SELECT pt.out_lng FROM public.point_near_center(p_lat, p_lng, c.id::text, LEAST(p_radius_miles, 28)) pt) AS lng,
      NULL::text AS parent_location
    FROM public.marketplace_chains c
    WHERE p_lat IS NOT NULL
      AND p_lng IS NOT NULL
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR c.marketplace_type = p_marketplace_type)
  ),
  chain_with_dist AS (
    SELECT
      cc.*,
      (public.calculate_distance(p_lat::numeric, p_lng::numeric, cc.lat, cc.lng) * 0.621371) AS dist_mi
    FROM chain_catalog cc
  ),
  chain_filtered AS (
    SELECT *
    FROM chain_with_dist cw
    WHERE cw.dist_mi <= p_radius_miles
  ),
  final_catalog AS (
    SELECT
      rf.id, rf.name, rf.status, rf.marketplace_type, rf.image_url, rf.logo_url,
      rf.cuisine_type, rf.city, rf.state, rf.address, rf.lat, rf.lng,
      rf.parent_location, rf.dist_mi AS distance_miles
    FROM real_filtered rf

    UNION ALL

    SELECT
      cf.id, cf.name, cf.status, cf.marketplace_type, cf.image_url, cf.logo_url,
      cf.cuisine_type, cf.city, cf.state, cf.address, cf.lat, cf.lng,
      cf.parent_location, cf.dist_mi AS distance_miles
    FROM chain_filtered cf
    CROSS JOIN real_count rc
    WHERE rc.cnt < 25
  )
  SELECT
    f.id, f.name, f.status, f.marketplace_type, f.image_url, f.logo_url,
    f.cuisine_type, f.city, f.state, f.address, f.lat, f.lng,
    f.parent_location, f.distance_miles
  FROM final_catalog f
  ORDER BY
    (CASE WHEN f.status = 'ACTIVE' THEN 0 WHEN f.status = 'COMING_SOON' THEN 1 ELSE 2 END),
    f.distance_miles NULLS LAST,
    f.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_marketplace_map_pins(numeric, numeric, numeric, text, integer) IS
  'Map pins with broader nationwide coverage: prioritize real storefront coordinates, then supplement with local synthetic marketplace_chains pins when real local density is low.';

GRANT EXECUTE ON FUNCTION public.get_marketplace_map_pins(numeric, numeric, numeric, text, integer) TO anon, authenticated;

