-- ============================================================================
-- Seed marketplace: chains, Toledo local restaurants, retail, malls (REQUESTABLE).
-- Run after 20260306000001. Uses Toledo, OH area coordinates.
-- ============================================================================

-- Toledo center approx: 41.6528, -83.5555. Spread entries with small offsets so they appear on map.
-- Only insert if restaurants_master has the new columns (safe to run after 20260306000001).

INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), n, 'Toledo', 'OH', 41.6528 + (row_number() OVER ()) * 0.002, -83.5555 + (row_number() OVER ()) * 0.001, 'Fast Food', 'REQUESTABLE', 'restaurant', 'https://cdn.brandfetch.io/' || lower(replace(n, ' ', '')) || '.com/logo'
FROM (VALUES
  ('McDonald''s'), ('Wendy''s'), ('Burger King'), ('Taco Bell'), ('KFC'), ('Subway'), ('Chipotle'), ('Five Guys'), ('Popeyes'), ('Chick-fil-A'),
  ('Panera Bread'), ('Jimmy John''s'), ('Little Caesars'), ('Pizza Hut'), ('Domino''s'), ('Wingstop'), ('Raising Cane''s'), ('Qdoba'), ('Firehouse Subs'), ('Jersey Mike''s'),
  ('Buffalo Wild Wings'), ('White Castle'), ('Steak ''n Shake'), ('Marco''s Pizza'), ('Papa John''s')
) AS t(n);

-- Toledo local restaurants (REQUESTABLE)
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), n, 'Toledo', 'OH', 41.65 + (row_number() OVER ()) * 0.003, -83.55 + (row_number() OVER ()) * 0.002, 'Local', 'REQUESTABLE', 'restaurant', NULL
FROM (VALUES
  ('Balance Grille'), ('Tony Packo''s'), ('Mancy''s Steakhouse'), ('Home Slice Pizza'), ('Fowl & Fodder'),
  ('Kengo Sushi'), ('Ye Olde Durty Bird'), ('Grumpy''s'), ('Doc Watson''s')
) AS t(n);

-- Retail stores (REQUESTABLE) – Toledo area
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), n, 'Toledo', 'OH', 41.66 + (row_number() OVER ()) * 0.002, -83.56 + (row_number() OVER ()) * 0.001, 'Retail', 'REQUESTABLE', 'retail', 'https://cdn.brandfetch.io/' || lower(replace(replace(n, ' ', ''), '&', '')) || '.com/logo'
FROM (VALUES
  ('Foot Locker'), ('Finish Line'), ('Zumiez'), ('H&M'), ('American Eagle'), ('Hot Topic'), ('PacSun'), ('Old Navy'), ('Ross'), ('TJ Maxx'),
  ('Marshalls'), ('Kohl''s'), ('Target'), ('Walmart'), ('DSW'), ('Shoe Carnival'), ('Rack Room Shoes')
) AS t(n);

-- Malls (REQUESTABLE) – marketplace_type = mall
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
VALUES
  (gen_random_uuid(), 'Franklin Park Mall', 'Toledo', 'OH', 41.6234, -83.6123, 'Mall', 'REQUESTABLE', 'mall', NULL),
  (gen_random_uuid(), 'Levis Commons', 'Perrysburg', 'OH', 41.5521, -83.6234, 'Mall', 'REQUESTABLE', 'mall', NULL),
  (gen_random_uuid(), 'The Shops at Fallen Timbers', 'Maumee', 'OH', 41.5612, -83.7012, 'Mall', 'REQUESTABLE', 'mall', NULL);
