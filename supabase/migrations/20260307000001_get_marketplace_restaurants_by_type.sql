-- ============================================================================
-- Add p_marketplace_type to get_marketplace_restaurants so Retail/Mall
-- sections and feeder map can request only that type (avoids limit cutting off
-- retail when many active restaurants fill the default result).
-- If "npm run db:push" fails (migration history mismatch), run this entire
-- file in Supabase Dashboard → SQL Editor for project xaxbucnjlrfkccsfiddq.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_marketplace_restaurants(
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_cuisine text DEFAULT NULL,
  p_limit int DEFAULT 200,
  p_marketplace_type text DEFAULT NULL
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
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR p_marketplace_type = 'restaurant')
      AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR r.cuisine_type ILIKE '%' || p_cuisine || '%')
    UNION ALL
    SELECT m.id, m.name, CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END,
           COALESCE(m.marketplace_type, 'restaurant'), COALESCE(m.image_url, m.logo_url), m.header_image_url,
           m.category, m.city, m.state, m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, m.request_count, NULL::text, NULL::numeric, m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR COALESCE(m.marketplace_type, 'restaurant') = p_marketplace_type)
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR m.category ILIKE '%' || p_cuisine || '%')
  ) AS catalog
  ORDER BY (CASE WHEN catalog.status = 'ACTIVE' THEN 0 WHEN catalog.status = 'COMING_SOON' THEN 1 ELSE 2 END), catalog.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_marketplace_restaurants(numeric, numeric, text, text, int, text) IS 'Catalog for consumer/feeder. Optional p_marketplace_type: restaurant | retail | mall to return only that type (ensures retail/mall are not cut off by limit).';
