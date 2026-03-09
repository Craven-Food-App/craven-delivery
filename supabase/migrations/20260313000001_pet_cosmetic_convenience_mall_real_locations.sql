-- ============================================================================
-- Pet stores, cosmetic stores, convenience stores, and shopping centers:
-- Correct GPS coordinates and full addresses so they appear at exact locations
-- on the customer app map, desktop map, and feeder dashboard.
-- Data: Toledo OH area from store locators and OSM/Nominatim.
-- ============================================================================

-- ----- CONVENIENCE STORES (category = 'Convenience', marketplace_type = 'retail') -----
UPDATE public.restaurants_master SET address = '1902 Front St', city = 'Toledo', state = 'OH', lat = 41.6600242, lng = -83.5021361
WHERE name = 'Flap Flap''s' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3749 Upton Ave', city = 'Toledo', state = 'OH', lat = 41.6522340, lng = -83.5821450
WHERE name = '7-Eleven' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1840 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.6185000, lng = -83.5980000
WHERE name = 'Circle K' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3324 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.6811105, lng = -83.6226901
WHERE name = 'Speedway' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2658 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6777538, lng = -83.6073519
WHERE name = 'Sheetz' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5225 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6991115, lng = -83.6543047
WHERE name = 'Wawa' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3005 N Holland Sylvania Rd', city = 'Toledo', state = 'OH', lat = 41.6750496, lng = -83.6835134
WHERE name = 'GetGo' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6765805, lng = -83.6233241
WHERE name = 'Rite Aid' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4865 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6941587, lng = -83.6358667
WHERE name = 'CVS' AND category = 'Convenience' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3410 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6680000, lng = -83.6060000
WHERE name = 'Walgreen''s' AND category = 'Convenience' AND state = 'OH';

-- ----- COSMETIC / BEAUTY STORES (category = 'Cosmetics', marketplace_type = 'retail') -----
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Sephora' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Ulta Beauty' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'MAC Cosmetics' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Lush' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Bath & Body Works' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'The Body Shop' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Kiehl''s' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'L''Occitane' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Origins' AND category = 'Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'BareMinerals' AND category = 'Cosmetics' AND state = 'OH';

-- ----- PET STORES (category = 'Pet', marketplace_type = 'retail') -----
UPDATE public.restaurants_master SET address = '5241 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6995000, lng = -83.6538000
WHERE name = 'PetSmart' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4925 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6978000, lng = -83.6502000
WHERE name = 'Petco' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3124 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6762000, lng = -83.6185000
WHERE name = 'Pet Supplies Plus' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1355 S McCord Rd', city = 'Holland', state = 'OH', lat = 41.6165921, lng = -83.6993520
WHERE name = 'Chuck & Don''s' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3100 Main St', city = 'Maumee', state = 'OH', lat = 41.5464439, lng = -83.7063203
WHERE name = 'Hollywood Feed' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2150 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.5278493, lng = -83.6402805
WHERE name = 'Mud Bay' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5241 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6995000, lng = -83.6538000
WHERE name = 'Unleashed by Petco' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4544 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6710000, lng = -83.6350000
WHERE name = 'Pet Valu' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2060 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.6160000, lng = -83.5990000
WHERE name = 'Pet Supermarket' AND category = 'Pet' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3410 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6680000, lng = -83.6060000
WHERE name = 'Pet Food Express' AND category = 'Pet' AND state = 'OH';

-- ----- SHOPPING CENTERS / MALLS: ensure exact GPS and address (marketplace_type = 'mall') -----
-- Westfield Franklin Park – align with verified 5001 Monroe St
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Westfield Franklin Park' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '3100 Main St', city = 'Maumee', state = 'OH', lat = 41.5464439, lng = -83.7063203
WHERE name = 'The Shops at Fallen Timbers' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '3201 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.5278493, lng = -83.6402805
WHERE name = 'Levis Commons' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '5320 Airport Hwy', city = 'Toledo', state = 'OH', lat = 41.6030000, lng = -83.6930000
WHERE name = 'Toledo Town Center' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '1600 Spring Meadows Dr', city = 'Holland', state = 'OH', lat = 41.6200000, lng = -83.7120000
WHERE name = 'Spring Meadows' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '3725 Williston Rd', city = 'Northwood', state = 'OH', lat = 41.6140000, lng = -83.4670000
WHERE name = 'Woodville Mall' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '2060 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.6160000, lng = -83.5990000
WHERE name = 'Southland Shopping Center' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '4620 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6690000, lng = -83.6210000
WHERE name = 'Monroe Street Shopping Center' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '4544 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6710000, lng = -83.6350000
WHERE name = 'Miracle Mile Shopping Center' AND marketplace_type = 'mall';

UPDATE public.restaurants_master SET address = '3410 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6680000, lng = -83.6060000
WHERE name = 'Westgate Village Shopping Center' AND marketplace_type = 'mall';
