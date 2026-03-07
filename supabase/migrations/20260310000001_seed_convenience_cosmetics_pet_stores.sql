-- ============================================================================
-- Seed marketplace: convenience stores, cosmetic stores, pet stores (REQUESTABLE).
-- Same pattern as 20260306000002. Toledo, OH area. marketplace_type = retail.
-- Idempotent: skips names that already exist for that category so safe to re-run.
-- ============================================================================

-- Convenience stores (e.g. Flap Flap's + chains)
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Toledo', 'OH', 41.648 + (row_number() OVER ()) * 0.002, -83.558 + (row_number() OVER ()) * 0.001, 'Convenience', 'REQUESTABLE', 'retail', NULL
FROM (VALUES
  ('Flap Flap''s'), ('7-Eleven'), ('Circle K'), ('Speedway'), ('Sheetz'), ('Wawa'), ('GetGo'), ('Rite Aid'), ('CVS'), ('Walgreen''s')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.restaurants_master m WHERE m.category = 'Convenience' AND m.name = v.n);

-- Cosmetic / beauty stores
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Toledo', 'OH', 41.651 + (row_number() OVER ()) * 0.002, -83.552 + (row_number() OVER ()) * 0.001, 'Cosmetics', 'REQUESTABLE', 'retail', NULL
FROM (VALUES
  ('Sephora'), ('Ulta Beauty'), ('MAC Cosmetics'), ('Lush'), ('Bath & Body Works'), ('The Body Shop'), ('Kiehl''s'), ('L''Occitane'), ('Origins'), ('BareMinerals')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.restaurants_master m WHERE m.category = 'Cosmetics' AND m.name = v.n);

-- Pet stores
INSERT INTO public.restaurants_master (id, name, city, state, lat, lng, category, status, marketplace_type, logo_url)
SELECT gen_random_uuid(), v.n, 'Toledo', 'OH', 41.654 + (row_number() OVER ()) * 0.002, -83.561 + (row_number() OVER ()) * 0.001, 'Pet', 'REQUESTABLE', 'retail', NULL
FROM (VALUES
  ('PetSmart'), ('Petco'), ('Pet Supplies Plus'), ('Chuck & Don''s'), ('Hollywood Feed'), ('Mud Bay'), ('Unleashed by Petco'), ('Pet Valu'), ('Pet Supermarket'), ('Pet Food Express')
) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.restaurants_master m WHERE m.category = 'Pet' AND m.name = v.n);
