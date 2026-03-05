-- =============================================================================
-- ONE-SHOT: Run this in Supabase Dashboard → SQL Editor if restaurants_master
-- doesn't exist yet. Run once. (Skip if you only had the 400 RPC error.)
-- =============================================================================

-- Tables
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
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
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

-- RLS
ALTER TABLE public.restaurants_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurants_master_select" ON public.restaurants_master;
CREATE POLICY "restaurants_master_select" ON public.restaurants_master FOR SELECT USING (true);
DROP POLICY IF EXISTS "restaurants_master_all_service" ON public.restaurants_master;
CREATE POLICY "restaurants_master_all_service" ON public.restaurants_master FOR ALL USING (false) WITH CHECK (false);

ALTER TABLE public.restaurant_notify_me ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurant_notify_me_insert" ON public.restaurant_notify_me;
CREATE POLICY "restaurant_notify_me_insert" ON public.restaurant_notify_me FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "restaurant_notify_me_select_own" ON public.restaurant_notify_me;
CREATE POLICY "restaurant_notify_me_select_own" ON public.restaurant_notify_me FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

GRANT ALL ON public.restaurants_master TO service_role;
GRANT ALL ON public.restaurant_notify_me TO service_role;
GRANT SELECT ON public.restaurants_master TO anon, authenticated;

-- Trigger
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

-- RPCs (get_marketplace_restaurants uses fixed catalog subquery)
CREATE OR REPLACE FUNCTION public.request_restaurant(p_restaurant_master_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.restaurants_master SET request_count = request_count + 1, last_requested_at = now(), updated_at = now()
  WHERE id = p_restaurant_master_id AND status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY');
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Restaurant not found or not requestable'); END IF;
  SELECT request_count INTO v_count FROM public.restaurants_master WHERE id = p_restaurant_master_id;
  RETURN jsonb_build_object('ok', true, 'request_count', v_count);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_me_restaurant(p_restaurant_master_id uuid, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_restaurant_master_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Restaurant required'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurants_master WHERE id = p_restaurant_master_id AND status = 'COMING_SOON') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restaurant not coming soon');
  END IF;
  INSERT INTO public.restaurant_notify_me (restaurant_master_id, email, user_id) VALUES (p_restaurant_master_id, NULLIF(TRIM(p_email), ''), auth.uid());
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('ok', true, 'message', 'Already signed up');
END; $$;

CREATE OR REPLACE FUNCTION public.get_marketplace_restaurants(p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL, p_search text DEFAULT NULL, p_cuisine text DEFAULT NULL, p_limit int DEFAULT 200)
RETURNS TABLE (id uuid, name text, status text, image_url text, header_image_url text, cuisine_type text, city text, state text, lat numeric, lng numeric, rating numeric, min_delivery_time int, max_delivery_time int, delivery_fee_cents int, is_promoted boolean, request_count int, description text, delivery_radius_miles numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT catalog.id, catalog.name, catalog.status, catalog.image_url, catalog.header_image_url, catalog.cuisine_type, catalog.city, catalog.state, catalog.lat, catalog.lng, catalog.rating, catalog.min_delivery_time, catalog.max_delivery_time, catalog.delivery_fee_cents, catalog.is_promoted, catalog.request_count, catalog.description, catalog.delivery_radius_miles
  FROM (
    SELECT r.id, r.name, 'ACTIVE'::text AS status, r.image_url, r.header_image_url, r.cuisine_type, r.city, r.state, r.latitude::numeric AS lat, r.longitude::numeric AS lng, r.rating, r.min_delivery_time::int, r.max_delivery_time::int, r.delivery_fee_cents, COALESCE(r.is_promoted, false) AS is_promoted, NULL::int AS request_count, r.description, r.delivery_radius_miles
    FROM public.restaurants r WHERE r.is_active = true AND (p_search IS NULL OR p_search = '' OR r.name ILIKE '%' || p_search || '%' OR r.cuisine_type ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%') AND (p_cuisine IS NULL OR p_cuisine = '' OR r.cuisine_type ILIKE '%' || p_cuisine || '%')
    UNION ALL
    SELECT m.id, m.name, CASE WHEN m.status = 'LEAD_READY' THEN 'REQUESTABLE'::text ELSE m.status END, COALESCE(m.image_url, m.logo_url), m.header_image_url, m.category, m.city, m.state, m.lat, m.lng, NULL::numeric, NULL::int, NULL::int, NULL::int, false, m.request_count, NULL::text, NULL::numeric
    FROM public.restaurants_master m WHERE m.status IN ('REQUESTABLE', 'COMING_SOON', 'LEAD_READY') AND (p_search IS NULL OR p_search = '' OR m.name ILIKE '%' || p_search || '%' OR m.category ILIKE '%' || p_search || '%') AND (p_cuisine IS NULL OR p_cuisine = '' OR m.category ILIKE '%' || p_cuisine || '%')
  ) AS catalog
  ORDER BY (CASE WHEN catalog.status = 'ACTIVE' THEN 0 WHEN catalog.status = 'COMING_SOON' THEN 1 ELSE 2 END), catalog.name LIMIT p_limit;
END; $$;

GRANT EXECUTE ON FUNCTION public.request_restaurant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_me_restaurant(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_restaurants(numeric, numeric, text, text, int) TO anon, authenticated;

-- Seed (run once; if you already have rows, skip this block or run and ignore duplicate errors)
INSERT INTO public.restaurants_master (name, city, state, address, lat, lng, category, status) VALUES
('McDonald''s', 'Toledo', 'OH', NULL, 41.6528, -83.5379, 'American', 'REQUESTABLE'), ('Chipotle', 'Toledo', 'OH', NULL, 41.6530, -83.5380, 'Mexican', 'REQUESTABLE'), ('Chick-fil-A', 'Toledo', 'OH', NULL, 41.6532, -83.5382, 'American', 'REQUESTABLE'), ('Wendy''s', 'Toledo', 'OH', NULL, 41.6534, -83.5384, 'American', 'REQUESTABLE'), ('Taco Bell', 'Toledo', 'OH', NULL, 41.6536, -83.5386, 'Mexican', 'REQUESTABLE'), ('Burger King', 'Toledo', 'OH', NULL, 41.6538, -83.5388, 'American', 'REQUESTABLE'), ('Five Guys', 'Toledo', 'OH', NULL, 41.6540, -83.5390, 'American', 'REQUESTABLE'), ('Raising Cane''s', 'Toledo', 'OH', NULL, 41.6542, -83.5392, 'American', 'REQUESTABLE'), ('Wingstop', 'Toledo', 'OH', NULL, 41.6544, -83.5394, 'American', 'REQUESTABLE'), ('Panera Bread', 'Toledo', 'OH', NULL, 41.6546, -83.5396, 'American', 'REQUESTABLE'), ('Jimmy John''s', 'Toledo', 'OH', NULL, 41.6548, -83.5398, 'Sandwiches', 'REQUESTABLE'), ('Subway', 'Toledo', 'OH', NULL, 41.6550, -83.5400, 'Sandwiches', 'REQUESTABLE'), ('Firehouse Subs', 'Toledo', 'OH', NULL, 41.6552, -83.5402, 'Sandwiches', 'REQUESTABLE'), ('Jersey Mike''s', 'Toledo', 'OH', NULL, 41.6554, -83.5404, 'Sandwiches', 'REQUESTABLE'), ('Little Caesars', 'Toledo', 'OH', NULL, 41.6556, -83.5406, 'Pizza', 'REQUESTABLE'), ('Pizza Hut', 'Toledo', 'OH', NULL, 41.6558, -83.5408, 'Pizza', 'REQUESTABLE'), ('Domino''s', 'Toledo', 'OH', NULL, 41.6560, -83.5410, 'Pizza', 'REQUESTABLE'), ('Marco''s Pizza', 'Toledo', 'OH', NULL, 41.6562, -83.5412, 'Pizza', 'REQUESTABLE'), ('Papa Johns', 'Toledo', 'OH', NULL, 41.6564, -83.5414, 'Pizza', 'REQUESTABLE'), ('Qdoba', 'Toledo', 'OH', NULL, 41.6566, -83.5416, 'Mexican', 'REQUESTABLE'), ('Popeyes', 'Toledo', 'OH', NULL, 41.6568, -83.5418, 'American', 'REQUESTABLE'), ('KFC', 'Toledo', 'OH', NULL, 41.6570, -83.5420, 'American', 'REQUESTABLE'), ('Arby''s', 'Toledo', 'OH', NULL, 41.6572, -83.5422, 'American', 'REQUESTABLE'), ('Buffalo Wild Wings', 'Toledo', 'OH', NULL, 41.6574, -83.5424, 'American', 'REQUESTABLE'), ('White Castle', 'Toledo', 'OH', NULL, 41.6576, -83.5426, 'American', 'REQUESTABLE'), ('Steak ''n Shake', 'Toledo', 'OH', NULL, 41.6578, -83.5428, 'American', 'REQUESTABLE'), ('Culver''s', 'Toledo', 'OH', NULL, 41.6580, -83.5430, 'American', 'REQUESTABLE'), ('Dairy Queen', 'Toledo', 'OH', NULL, 41.6582, -83.5432, 'American', 'REQUESTABLE');
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Starbucks', 'Toledo', 'OH', 41.6590, -83.5435, 'Coffee', 'REQUESTABLE'), ('Dunkin''', 'Toledo', 'OH', 41.6592, -83.5437, 'Coffee', 'REQUESTABLE'), ('Panda Express', 'Toledo', 'OH', 41.6594, -83.5439, 'Chinese', 'REQUESTABLE'), ('Sonic', 'Toledo', 'OH', 41.6596, -83.5441, 'American', 'REQUESTABLE'), ('Applebee''s', 'Toledo', 'OH', 41.6598, -83.5443, 'American', 'REQUESTABLE'), ('Olive Garden', 'Toledo', 'OH', 41.6600, -83.5445, 'Italian', 'REQUESTABLE'), ('Red Lobster', 'Toledo', 'OH', 41.6602, -83.5447, 'Seafood', 'REQUESTABLE'), ('Outback Steakhouse', 'Toledo', 'OH', 41.6604, -83.5449, 'Steakhouse', 'REQUESTABLE'), ('Texas Roadhouse', 'Toledo', 'OH', 41.6606, -83.5451, 'Steakhouse', 'REQUESTABLE'), ('IHOP', 'Toledo', 'OH', 41.6608, -83.5453, 'Breakfast', 'REQUESTABLE'), ('Denny''s', 'Toledo', 'OH', 41.6610, -83.5455, 'Breakfast', 'REQUESTABLE'), ('Bob Evans', 'Toledo', 'OH', 41.6612, -83.5457, 'American', 'REQUESTABLE'), ('Chili''s', 'Toledo', 'OH', 41.6614, -83.5459, 'American', 'REQUESTABLE'), ('Red Robin', 'Toledo', 'OH', 41.6616, -83.5461, 'American', 'REQUESTABLE'), ('Cracker Barrel', 'Toledo', 'OH', 41.6618, -83.5463, 'American', 'REQUESTABLE');
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Balance Grille', 'Toledo', 'OH', 41.6528, -83.5379, 'Asian', 'REQUESTABLE'), ('Tony Packo''s', 'Toledo', 'OH', 41.6510, -83.5350, 'American', 'COMING_SOON'), ('Mancy''s Steakhouse', 'Toledo', 'OH', 41.6530, -83.5360, 'Steakhouse', 'COMING_SOON'), ('Mancy''s Italian Grill', 'Toledo', 'OH', 41.6532, -83.5362, 'Italian', 'COMING_SOON'), ('Rosie''s Italian Grille', 'Toledo', 'OH', 41.6534, -83.5364, 'Italian', 'REQUESTABLE'), ('Home Slice Pizza', 'Toledo', 'OH', 41.6536, -83.5366, 'Pizza', 'REQUESTABLE'), ('Grumpy''s', 'Toledo', 'OH', 41.6538, -83.5368, 'American', 'REQUESTABLE'), ('Ye Olde Durty Bird', 'Toledo', 'OH', 41.6540, -83.5370, 'American', 'REQUESTABLE'), ('Doc Watson''s', 'Toledo', 'OH', 41.6542, -83.5372, 'American', 'REQUESTABLE'), ('Fowl & Fodder', 'Toledo', 'OH', 41.6544, -83.5374, 'American', 'REQUESTABLE'), ('The Blarney Irish Pub', 'Toledo', 'OH', 41.6546, -83.5376, 'American', 'REQUESTABLE'), ('The Attic on Adams', 'Toledo', 'OH', 41.6548, -83.5378, 'American', 'REQUESTABLE'), ('Shorty''s True American Roadhouse', 'Toledo', 'OH', 41.6550, -83.5380, 'American', 'REQUESTABLE'), ('Kengo Sushi & Yakitori', 'Toledo', 'OH', 41.6552, -83.5382, 'Japanese', 'COMING_SOON'), ('Bangkok Kitchen', 'Toledo', 'OH', 41.6554, -83.5384, 'Thai', 'REQUESTABLE'), ('QQ Kitchen', 'Toledo', 'OH', 41.6556, -83.5386, 'Chinese', 'REQUESTABLE'), ('Original Sub Shop', 'Toledo', 'OH', 41.6558, -83.5388, 'Sandwiches', 'REQUESTABLE'), ('Rudy''s Hot Dog', 'Toledo', 'OH', 41.6560, -83.5390, 'American', 'REQUESTABLE'), ('Schmucker''s Restaurant', 'Toledo', 'OH', 41.6562, -83.5392, 'American', 'REQUESTABLE'), ('Manhattan''s Pub ''n Cheer', 'Toledo', 'OH', 41.6564, -83.5394, 'American', 'REQUESTABLE'), ('Nick & Jimmy''s', 'Toledo', 'OH', 41.6566, -83.5396, 'American', 'REQUESTABLE'), ('Pizza Papalis', 'Toledo', 'OH', 41.6568, -83.5398, 'Pizza', 'REQUESTABLE'), ('San Marcos Mexican', 'Toledo', 'OH', 41.6570, -83.5400, 'Mexican', 'REQUESTABLE'), ('The Beirut', 'Toledo', 'OH', 41.6572, -83.5402, 'Mediterranean', 'REQUESTABLE');
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Village Idiot', 'Maumee', 'OH', 41.5634, -83.6538, 'American', 'REQUESTABLE'), ('Star Diner', 'Maumee', 'OH', 41.5636, -83.6540, 'American', 'REQUESTABLE'), ('Inside the Five Brewing', 'Maumee', 'OH', 41.5638, -83.6542, 'American', 'REQUESTABLE'), ('Swig', 'Perrysburg', 'OH', 41.5567, -83.6272, 'American', 'REQUESTABLE'), ('Benchmark Restaurant', 'Perrysburg', 'OH', 41.5569, -83.6274, 'American', 'COMING_SOON'), ('Zingo''s Mediterranean', 'Perrysburg', 'OH', 41.5571, -83.6276, 'Mediterranean', 'REQUESTABLE'), ('Bar Louie', 'Perrysburg', 'OH', 41.5573, -83.6278, 'American', 'REQUESTABLE'), ('Nagoya Japanese Steakhouse', 'Perrysburg', 'OH', 41.5575, -83.6280, 'Japanese', 'REQUESTABLE'), ('The Flying Joe', 'Sylvania', 'OH', 41.7189, -83.7125, 'Coffee', 'REQUESTABLE'), ('Dale''s Bar & Grill', 'Sylvania', 'OH', 41.7191, -83.7127, 'American', 'REQUESTABLE'), ('Local Bistro', 'Oregon', 'OH', 41.6437, -83.4869, 'American', 'REQUESTABLE'), ('Harbor View Grill', 'Oregon', 'OH', 41.6439, -83.4871, 'American', 'REQUESTABLE'), ('Holland House', 'Holland', 'OH', 41.6217, -83.7119, 'American', 'REQUESTABLE'), ('Bowling Green Grill', 'Bowling Green', 'OH', 41.3748, -83.6513, 'American', 'REQUESTABLE'), ('Falcon''s Nest', 'Bowling Green', 'OH', 41.3750, -83.6515, 'American', 'REQUESTABLE');

-- Remove duplicates (keeps one per name+city if seed was run more than once)
DELETE FROM public.restaurants_master
WHERE id NOT IN (
  SELECT DISTINCT ON (name, city) id FROM public.restaurants_master ORDER BY name, city, created_at
);
