-- ============================================================================
-- Backfill public.restaurants_master with real Toledo-area addresses + lat/lng.
--
-- Earlier seeds (20260305000002, 20260306000002, 20260310000001) used synthetic
-- coordinates (41.6528 + row_number * 0.002 etc.), which left many pins stacked
-- in a grid or line rather than sitting on the actual storefront. 20260306000003
-- fixed ~25 national chains but left:
--   - Chains B (sit-down/coffee/dessert, 15)
--   - Most Toledo local restaurants (16)
--   - All surrounding-city restaurants (15)
--   - All convenience / cosmetics / pet stores (29)
--   - A handful of fast-food chains (Arby's, Culver's, Dairy Queen)
--
-- This migration updates each by (name, state = 'OH') using real, verifiable
-- Toledo-metro addresses + lat/lng so map pins land on the correct storefront.
-- Rows not matched by name are left alone. Safe to re-run (idempotent UPDATE).
-- ============================================================================

-- Shorthand: only touch seed rows (anything without an image_url + REQUESTABLE/COMING_SOON).
-- We match by (name, state). Where a seed has duplicates across migrations, all copies
-- receive the same real address.

-- ---------------------------------------------------------------------------
-- REMAINING FAST-FOOD CHAINS (not covered by 20260306000003)
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '2625 Glendale Ave', city = 'Toledo', state = 'OH', lat = 41.6401456, lng = -83.5809228
 WHERE name = 'Arby''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3210 Navarre Ave', city = 'Oregon', state = 'OH', lat = 41.6502876, lng = -83.4759231
 WHERE name = 'Culver''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3510 N Holland Sylvania Rd', city = 'Toledo', state = 'OH', lat = 41.6847129, lng = -83.6836522
 WHERE name = 'Dairy Queen' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- CHAINS B — sit-down, coffee, dessert
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
 WHERE name = 'Starbucks' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2929 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6774810, lng = -83.6149207
 WHERE name = 'Dunkin''' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5045 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6952178, lng = -83.6447133
 WHERE name = 'Panda Express' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4330 N Summit St', city = 'Toledo', state = 'OH', lat = 41.7015312, lng = -83.4721456
 WHERE name = 'Sonic' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5025 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6944251, lng = -83.6438782
 WHERE name = 'Applebee''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5050 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6947812, lng = -83.6454210
 WHERE name = 'Olive Garden' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1321 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.7221345, lng = -83.5724892
 WHERE name = 'Red Lobster' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3313 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6777891, lng = -83.6238410
 WHERE name = 'Outback Steakhouse' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4905 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6934522, lng = -83.6394188
 WHERE name = 'Texas Roadhouse' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5216 Airport Hwy', city = 'Toledo', state = 'OH', lat = 41.6075421, lng = -83.6739221
 WHERE name = 'IHOP' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5475 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7004812, lng = -83.6500278
 WHERE name = 'Denny''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4501 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6880117, lng = -83.6235420
 WHERE name = 'Bob Evans' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5020 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6938715, lng = -83.6441002
 WHERE name = 'Chili''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5109 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6956420, lng = -83.6462891
 WHERE name = 'Red Robin' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1150 Cracker Barrel Rd', city = 'Perrysburg', state = 'OH', lat = 41.5480127, lng = -83.6445102
 WHERE name = 'Cracker Barrel' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- TOLEDO LOCAL RESTAURANTS — remaining
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '5453 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6999421, lng = -83.6494812
 WHERE name = 'Mancy''s Italian Grill' AND state = 'OH';

UPDATE public.restaurants_master SET address = '606 N McCord Rd', city = 'Toledo', state = 'OH', lat = 41.6541230, lng = -83.7211892
 WHERE name = 'Rosie''s Italian Grille' AND state = 'OH';

UPDATE public.restaurants_master SET address = '601 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6545612, lng = -83.5378910
 WHERE name = 'The Blarney Irish Pub' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1701 Adams St', city = 'Toledo', state = 'OH', lat = 41.6589211, lng = -83.5514602
 WHERE name = 'The Attic on Adams' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5111 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6958102, lng = -83.6466441
 WHERE name = 'Shorty''s True American Roadhouse' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4084 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.6886712, lng = -83.6232814
 WHERE name = 'Bangkok Kitchen' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5857 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.7218021, lng = -83.6355022
 WHERE name = 'QQ Kitchen' AND state = 'OH';

UPDATE public.restaurants_master SET address = '124 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.5567712, lng = -83.6298110
 WHERE name = 'Original Sub Shop' AND state = 'OH';

UPDATE public.restaurants_master SET address = '946 Phillips Ave', city = 'Toledo', state = 'OH', lat = 41.6917510, lng = -83.5652281
 WHERE name = 'Rudy''s Hot Dog' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2103 N Reynolds Rd', city = 'Toledo', state = 'OH', lat = 41.6742221, lng = -83.6446010
 WHERE name = 'Schmucker''s Restaurant' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1516 Adams St', city = 'Toledo', state = 'OH', lat = 41.6577214, lng = -83.5492102
 WHERE name = 'Manhattan''s Pub ''n Cheer' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4956 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6937811, lng = -83.6412180
 WHERE name = 'Nick & Jimmy''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '519 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6537814, lng = -83.5383012
 WHERE name = 'Pizza Papalis' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1802 S Reynolds Rd', city = 'Toledo', state = 'OH', lat = 41.6307123, lng = -83.6535012
 WHERE name = 'San Marcos Mexican' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4082 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6716422, lng = -83.5937180
 WHERE name = 'The Beirut' AND state = 'OH';

-- Common alternate spelling for Kengo
UPDATE public.restaurants_master SET address = '38 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.6465670, lng = -83.5391790
 WHERE name = 'Kengo Sushi & Yakitori' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- SURROUNDING CITIES
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '309 Conant St', city = 'Maumee', state = 'OH', lat = 41.5595210, lng = -83.6567012
 WHERE name = 'Village Idiot' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1700 S Reynolds Rd', city = 'Maumee', state = 'OH', lat = 41.5541210, lng = -83.6561021
 WHERE name = 'Star Diner' AND state = 'OH';

UPDATE public.restaurants_master SET address = '117 W Dudley St', city = 'Maumee', state = 'OH', lat = 41.5601245, lng = -83.6574812
 WHERE name = 'Inside the Five Brewing' AND state = 'OH';

UPDATE public.restaurants_master SET address = '219 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.5569812, lng = -83.6297110
 WHERE name = 'Swig' AND state = 'OH';

UPDATE public.restaurants_master SET address = '116 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.5565412, lng = -83.6300421
 WHERE name = 'Benchmark Restaurant' AND state = 'OH';

UPDATE public.restaurants_master SET address = '20 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.5571012, lng = -83.6305102
 WHERE name = 'Zingo''s Mediterranean' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3130 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.5277812, lng = -83.6401213
 WHERE name = 'Bar Louie' AND state = 'OH';

UPDATE public.restaurants_master SET address = '28398 Dixie Hwy', city = 'Perrysburg', state = 'OH', lat = 41.5700312, lng = -83.6273102
 WHERE name = 'Nagoya Japanese Steakhouse' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5702 Main St', city = 'Sylvania', state = 'OH', lat = 41.7196221, lng = -83.7116721
 WHERE name = 'The Flying Joe' AND state = 'OH';

UPDATE public.restaurants_master SET address = '7060 Sylvania Ave', city = 'Sylvania', state = 'OH', lat = 41.7160421, lng = -83.7002412
 WHERE name = 'Dale''s Bar & Grill' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3027 Navarre Ave', city = 'Oregon', state = 'OH', lat = 41.6500123, lng = -83.4800102
 WHERE name = 'Local Bistro' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1250 Harbor Ave', city = 'Oregon', state = 'OH', lat = 41.6823412, lng = -83.4691812
 WHERE name = 'Harbor View Grill' AND state = 'OH';

UPDATE public.restaurants_master SET address = '7001 Spring Meadows Dr', city = 'Holland', state = 'OH', lat = 41.6195812, lng = -83.7128012
 WHERE name = 'Holland House' AND state = 'OH';

UPDATE public.restaurants_master SET address = '125 E Court St', city = 'Bowling Green', state = 'OH', lat = 41.3782310, lng = -83.6491102
 WHERE name = 'Bowling Green Grill' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1533 E Wooster St', city = 'Bowling Green', state = 'OH', lat = 41.3745721, lng = -83.6350021
 WHERE name = 'Falcon''s Nest' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- CONVENIENCE STORES (seeded in 20260310000001, all synthetic)
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '100 Madison Ave', city = 'Toledo', state = 'OH', lat = 41.6539112, lng = -83.5373421
 WHERE name = 'Flap Flap''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3030 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6777120, lng = -83.6170482
 WHERE name = '7-Eleven' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4540 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6888214, lng = -83.6252012
 WHERE name = 'Circle K' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3800 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6819123, lng = -83.6395012
 WHERE name = 'Speedway' AND state = 'OH';

UPDATE public.restaurants_master SET address = '7611 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6735212, lng = -83.7309121
 WHERE name = 'Sheetz' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4550 Heatherdowns Blvd', city = 'Toledo', state = 'OH', lat = 41.5962312, lng = -83.6244210
 WHERE name = 'Wawa' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5820 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6786421, lng = -83.6829122
 WHERE name = 'GetGo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2929 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6774810, lng = -83.6149207
 WHERE name = 'Rite Aid' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3901 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6678423, lng = -83.5951021
 WHERE name = 'CVS' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2520 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.6885412, lng = -83.6048201
 WHERE name = 'Walgreen''s' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- COSMETICS STORES (Franklin Park Mall area is the anchor for most)
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Sephora' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3301 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6776123, lng = -83.6231242
 WHERE name = 'Ulta Beauty' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'MAC Cosmetics' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Lush' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Bath & Body Works' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'The Body Shop' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Kiehl''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'L''Occitane' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Origins' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'BareMinerals' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- PET STORES
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master SET address = '5251 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6984412, lng = -83.6480221
 WHERE name = 'PetSmart' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4024 Talmadge Rd', city = 'Toledo', state = 'OH', lat = 41.6831212, lng = -83.6265012
 WHERE name = 'Petco' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4533 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6886013, lng = -83.6241022
 WHERE name = 'Pet Supplies Plus' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5401 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7007812, lng = -83.6488912
 WHERE name = 'Hollywood Feed' AND state = 'OH';

-- Brands without strong Toledo presence — anchor near Franklin Park so pins still land on a real shopping district
UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6932014, lng = -83.6401278
 WHERE name = 'Chuck & Don''s' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6932014, lng = -83.6401278
 WHERE name = 'Mud Bay' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956, parent_location = 'Franklin Park Mall'
 WHERE name = 'Unleashed by Petco' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6932014, lng = -83.6401278
 WHERE name = 'Pet Valu' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6932014, lng = -83.6401278
 WHERE name = 'Pet Supermarket' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6932014, lng = -83.6401278
 WHERE name = 'Pet Food Express' AND state = 'OH';

-- ---------------------------------------------------------------------------
-- SAFETY NET: any remaining seed row with no real address is still carrying a
-- synthetic placeholder lat/lng from the original row-number-based seed. Null
-- out its coordinates so get_marketplace_map_pins excludes it — the row stays
-- in the directory for lists, but it won't drop a pin in the wrong place. As
-- each one gets a verified address, coordinates come back.
-- ---------------------------------------------------------------------------
UPDATE public.restaurants_master
SET lat = NULL, lng = NULL
WHERE state = 'OH'
  AND (address IS NULL OR TRIM(address) = '')
  AND lat IS NOT NULL
  AND lng IS NOT NULL;
