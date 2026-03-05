-- Fix: column reference "status" is ambiguous in get_marketplace_restaurants
-- Wrap UNION in a subquery so ORDER BY references catalog.status / catalog.name unambiguously.

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
