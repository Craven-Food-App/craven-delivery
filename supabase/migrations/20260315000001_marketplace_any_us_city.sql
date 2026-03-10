-- ============================================================================
-- Marketplace adapts to every US city/state: same chains, locations generated
-- around the customer's (lat, lng). 25-30 mile radius; stores outside radius
-- never show (even if searched).
-- ============================================================================

-- 1) Table of national chains (no fixed city/lat/lng). One row per chain.
--    Locations are generated at query time from customer's coordinates.
CREATE TABLE IF NOT EXISTS public.marketplace_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  marketplace_type text NOT NULL DEFAULT 'restaurant',
  logo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_chains_type ON public.marketplace_chains(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_chains_category ON public.marketplace_chains(category);

ALTER TABLE public.marketplace_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read marketplace_chains"
  ON public.marketplace_chains FOR SELECT USING (true);

-- 2) Deterministic point near (lat_center, lng_center) from seed. Returns (lat, lng).
--    Used so the same chain gets the same pin for the same customer location.
CREATE OR REPLACE FUNCTION public.point_near_center(
  p_lat numeric,
  p_lng numeric,
  p_seed text,
  p_radius_miles numeric DEFAULT 28
)
RETURNS TABLE (out_lat numeric, out_lng numeric)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  h text;
  angle_deg int;
  dist_mi numeric;
  lat_rad numeric;
  lng_rad numeric;
  dx numeric;
  dy numeric;
  miles_per_deg_lat constant numeric := 69.0;
  miles_per_deg_lng numeric;
BEGIN
  h := md5(p_seed || round(p_lat::numeric, 4)::text || round(p_lng::numeric, 4)::text);
  angle_deg := ('x' || substring(h from 1 for 4))::bit(16)::int;
  IF angle_deg < 0 THEN angle_deg := angle_deg + 65536; END IF;
  angle_deg := angle_deg % 360;
  dist_mi := 2 + (('x' || substring(h from 5 for 4))::bit(16)::int % 65536);
  IF dist_mi < 0 THEN dist_mi := dist_mi + 65536; END IF;
  dist_mi := 2 + (dist_mi % 27)::numeric;

  lat_rad := radians(p_lat);
  miles_per_deg_lng := miles_per_deg_lat * cos(lat_rad);
  dy := (dist_mi / miles_per_deg_lat) * cos(radians(angle_deg::numeric));
  dx := (dist_mi / miles_per_deg_lng) * sin(radians(angle_deg::numeric));
  out_lat := p_lat + dy;
  out_lng := p_lng + dx;
  RETURN NEXT;
END;
$$;

-- 3) Seed national chains (restaurant, retail, mall). Same names everywhere. Idempotent.
INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Fast Food', 'restaurant', NULL
FROM (VALUES
  ('McDonald''s'), ('Wendy''s'), ('Burger King'), ('Taco Bell'), ('KFC'), ('Subway'), ('Chipotle'), ('Five Guys'), ('Popeyes'), ('Chick-fil-A'),
  ('Panera Bread'), ('Jimmy John''s'), ('Little Caesars'), ('Pizza Hut'), ('Domino''s'), ('Wingstop'), ('Raising Cane''s'), ('Qdoba'), ('Firehouse Subs'), ('Jersey Mike''s'),
  ('Buffalo Wild Wings'), ('White Castle'), ('Steak ''n Shake'), ('Marco''s Pizza'), ('Papa John''s')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Fast Food');

INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Retail', 'retail', NULL
FROM (VALUES
  ('Foot Locker'), ('Finish Line'), ('Zumiez'), ('H&M'), ('American Eagle'), ('Hot Topic'), ('PacSun'), ('Old Navy'), ('Ross'), ('TJ Maxx'),
  ('Marshalls'), ('Kohl''s'), ('Target'), ('Walmart'), ('DSW'), ('Shoe Carnival'), ('Rack Room Shoes')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Retail');

INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Convenience', 'retail', NULL
FROM (VALUES
  ('7-Eleven'), ('Circle K'), ('Speedway'), ('Sheetz'), ('Wawa'), ('GetGo'), ('Rite Aid'), ('CVS'), ('Walgreen''s')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Convenience');

INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Cosmetics', 'retail', NULL
FROM (VALUES
  ('Sephora'), ('Ulta Beauty'), ('MAC Cosmetics'), ('Lush'), ('Bath & Body Works'), ('The Body Shop'), ('Kiehl''s'), ('L''Occitane'), ('Origins'), ('BareMinerals')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Cosmetics');

INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Pet', 'retail', NULL
FROM (VALUES
  ('PetSmart'), ('Petco'), ('Pet Supplies Plus'), ('Hollywood Feed'), ('Mud Bay'), ('Unleashed by Petco'), ('Pet Valu'), ('Pet Supermarket'), ('Pet Food Express')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Pet');

INSERT INTO public.marketplace_chains (id, name, category, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Mall', 'mall', NULL
FROM (VALUES
  ('Shopping Center'), ('Mall'), ('Outlet Center')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_chains m WHERE m.name = v.n AND m.category = 'Mall');

-- 4) get_marketplace_restaurants: add p_radius_miles; when p_lat/p_lng set,
--    include (1) active restaurants within radius, (2) restaurants_master within radius,
--    (3) marketplace_chains with generated (lat,lng) within radius. Only return rows within radius.
DROP FUNCTION IF EXISTS public.get_marketplace_restaurants(numeric, numeric, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.get_marketplace_restaurants(
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_cuisine text DEFAULT NULL,
  p_limit int DEFAULT 200,
  p_marketplace_type text DEFAULT NULL,
  p_radius_miles numeric DEFAULT 30
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
  parent_location text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH catalog AS (
    SELECT r.id, r.name, 'ACTIVE'::text AS status, 'restaurant'::text AS marketplace_type,
           r.image_url, r.header_image_url, r.cuisine_type, r.city, r.state,
           (TRIM(COALESCE(r.address, '') || COALESCE(', ' || NULLIF(TRIM(r.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(r.state), ''), '')))::text AS address,
           r.latitude::numeric AS lat, r.longitude::numeric AS lng, r.rating,
           r.min_delivery_time::int, r.max_delivery_time::int, r.delivery_fee_cents,
           COALESCE(r.is_promoted, false) AS is_promoted, NULL::int AS request_count,
           r.description, r.delivery_radius_miles, NULL::text AS parent_location
    FROM public.restaurants r
    WHERE r.is_active = true
      AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR p_marketplace_type = 'restaurant')
      AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR r.cuisine_type ILIKE '%' || p_cuisine || '%')
    UNION ALL
    SELECT m.id, m.name, CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END,
           COALESCE(m.marketplace_type, 'restaurant'), COALESCE(m.image_url, m.logo_url), m.header_image_url,
           m.category, m.city, m.state,
           (TRIM(COALESCE(m.address, '') || COALESCE(', ' || NULLIF(TRIM(m.city), ''), '') || COALESCE(' ' || NULLIF(TRIM(m.state), ''), '')))::text AS address,
           m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int,
           false, m.request_count, NULL::text, NULL::numeric, m.parent_location
    FROM public.restaurants_master m
    WHERE m.status IN ('ACTIVE', 'REQUESTABLE', 'COMING_SOON', 'LEAD_READY')
      AND m.lat IS NOT NULL AND m.lng IS NOT NULL
      AND (p_marketplace_type IS NULL OR p_marketplace_type = '' OR COALESCE(m.marketplace_type, 'restaurant') = p_marketplace_type)
      AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%')
      AND (p_cuisine IS NULL OR p_cuisine = '' OR m.category ILIKE '%' || p_cuisine || '%')
    UNION ALL
    SELECT c.id, c.name, 'REQUESTABLE'::text,
           c.marketplace_type, c.logo_url, NULL::text,
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
      AND (p_cuisine IS NULL OR p_cuisine = '' OR c.category ILIKE '%' || p_cuisine || '%')
  ),
  with_dist AS (
    SELECT c.*,
           CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND c.lat IS NOT NULL AND c.lng IS NOT NULL
                THEN (public.calculate_distance(p_lat::numeric, p_lng::numeric, c.lat, c.lng) * 0.621371)
                ELSE NULL END AS dist_mi
    FROM catalog c
  )
  SELECT
    w.id, w.name, w.status, w.marketplace_type, w.image_url, w.header_image_url,
    w.cuisine_type, w.city, w.state, w.address,
    w.lat, w.lng, w.rating, w.min_delivery_time, w.max_delivery_time,
    w.delivery_fee_cents, w.is_promoted, w.request_count, w.description, w.delivery_radius_miles,
    w.parent_location
  FROM with_dist w
  WHERE (p_lat IS NULL AND p_lng IS NULL) OR (w.dist_mi IS NOT NULL AND w.dist_mi <= p_radius_miles)
  ORDER BY
    (CASE WHEN w.status = 'ACTIVE' THEN 0 WHEN w.status = 'COMING_SOON' THEN 1 ELSE 2 END),
    w.dist_mi NULLS LAST,
    w.name
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_marketplace_restaurants(numeric, numeric, text, text, integer, text, numeric) IS 'Marketplace for any US city: when p_lat/p_lng provided, returns active restaurants + restaurants_master + national chains (marketplace_chains) with locations generated near the customer. Only locations within p_radius_miles (default 30) are returned.';
GRANT EXECUTE ON FUNCTION public.get_marketplace_restaurants(numeric, numeric, text, text, integer, text, numeric) TO anon, authenticated;
