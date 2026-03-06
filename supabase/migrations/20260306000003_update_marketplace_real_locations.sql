-- ============================================================================
-- Update marketplace seed with REAL Toledo-area addresses and coordinates.
-- Run after 20260306000002. Coordinates from OpenStreetMap/Nominatim; addresses
-- from official store locators, mall directories, and verified business listings.
-- Pins on feeder and customer maps now reflect actual store/mall locations.
-- ============================================================================

-- Ensure we only update rows that look like the seed (have REQUESTABLE status and Toledo-area city).
-- Match by (name, city) from seed; some city values are updated to real city (e.g. Holland, Maumee, Perrysburg).

-- ----- MALLS -----
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Franklin Park Mall' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3201 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.5278493, lng = -83.6402805
WHERE name = 'Levis Commons' AND city = 'Perrysburg' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3100 Main St', city = 'Maumee', state = 'OH', lat = 41.5464439, lng = -83.7063203
WHERE name = 'The Shops at Fallen Timbers' AND city = 'Maumee' AND state = 'OH';

-- ----- TOLEDO LOCAL RESTAURANTS -----
UPDATE public.restaurants_master SET address = '215 N Summit St', city = 'Toledo', state = 'OH', lat = 41.6499689, lng = -83.5349989
WHERE name = 'Balance Grille' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1902 Front St', city = 'Toledo', state = 'OH', lat = 41.6600242, lng = -83.5021361
WHERE name = 'Tony Packo''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '953 Phillips Ave', city = 'Toledo', state = 'OH', lat = 41.6921304, lng = -83.5649726
WHERE name = 'Mancy''s Steakhouse' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '28 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.6467782, lng = -83.5389452
WHERE name = 'Home Slice Pizza' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '614 Adams St', city = 'Toledo', state = 'OH', lat = 41.6539438, lng = -83.5362252
WHERE name = 'Fowl & Fodder' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '38 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.6465670, lng = -83.5391790
WHERE name = 'Kengo Sushi' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.6473470, lng = -83.5383410
WHERE name = 'Ye Olde Durty Bird' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '34 S Huron St', city = 'Toledo', state = 'OH', lat = 41.6479557, lng = -83.5406797
WHERE name = 'Grumpy''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1515 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.6120894, lng = -83.6256684
WHERE name = 'Doc Watson''s' AND city = 'Toledo' AND state = 'OH';

-- ----- CHAINS (one Toledo-area location each) -----
UPDATE public.restaurants_master SET address = '3005 N Holland Sylvania Rd', city = 'Toledo', state = 'OH', lat = 41.6750496, lng = -83.6835134
WHERE name = 'McDonald''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1859 Laskey Rd', city = 'Toledo', state = 'OH', lat = 41.7064857, lng = -83.5899235
WHERE name = 'Wendy''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '7447 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6733125, lng = -83.7218710
WHERE name = 'Burger King' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1220 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.7219097, lng = -83.5719895
WHERE name = 'Taco Bell' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '6790 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6751898, lng = -83.7063664
WHERE name = 'KFC' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3324 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.6811105, lng = -83.6226901
WHERE name = 'Subway' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6765805, lng = -83.6233241
WHERE name = 'Chipotle' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6765805, lng = -83.6233241
WHERE name = 'Five Guys' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3214 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.6793119, lng = -83.6221913
WHERE name = 'Popeyes' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4260 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.6916352, lng = -83.6439196
WHERE name = 'Chick-fil-A' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '7115 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6728899, lng = -83.7134739
WHERE name = 'Panera Bread' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3324 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.6811105, lng = -83.6226901
WHERE name = 'Jimmy John''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3245 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.7207622, lng = -83.6227360
WHERE name = 'Little Caesars' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1116 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.6926558, lng = -83.5674954
WHERE name = 'Pizza Hut' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5406 N Summit St', city = 'Toledo', state = 'OH', lat = 41.7187486, lng = -83.4789075
WHERE name = 'Domino''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3330 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6778199, lng = -83.6242584
WHERE name = 'Wingstop' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5150 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7004193, lng = -83.6471269
WHERE name = 'Raising Cane''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6765805, lng = -83.6233241
WHERE name = 'Qdoba' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5208 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7016783, lng = -83.6501189
WHERE name = 'Firehouse Subs' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4558 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6891122, lng = -83.6217031
WHERE name = 'Jersey Mike''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '6710 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6759626, lng = -83.7042852
WHERE name = 'Buffalo Wild Wings' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1615 Cherry St', city = 'Toledo', state = 'OH', lat = 41.6646780, lng = -83.5389306
WHERE name = 'White Castle' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '6710 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6759626, lng = -83.7042852
WHERE name = 'Steak ''n Shake' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2658 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6777538, lng = -83.6073519
WHERE name = 'Marco''s Pizza' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '2531 Key St', city = 'Toledo', state = 'OH', lat = 41.5910799, lng = -83.6454980
WHERE name = 'Papa John''s' AND city = 'Toledo' AND state = 'OH';

-- ----- RETAIL -----
UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Foot Locker' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Finish Line' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Zumiez' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'H&M' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'American Eagle' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Hot Topic' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'PacSun' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'Old Navy' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5245 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7016691, lng = -83.6546352
WHERE name = 'Ross' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '3315 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.6772899, lng = -83.6231637
WHERE name = 'TJ Maxx' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5245 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7016691, lng = -83.6546352
WHERE name = 'Marshalls' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '4865 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6941587, lng = -83.6358667
WHERE name = 'Kohl''s' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5225 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6991115, lng = -83.6543047
WHERE name = 'Target' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '1355 S McCord Rd', city = 'Holland', state = 'OH', lat = 41.6165921, lng = -83.6993520
WHERE name = 'Walmart' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.6930655, lng = -83.6414956
WHERE name = 'DSW' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5221 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7008348, lng = -83.6521952
WHERE name = 'Shoe Carnival' AND city = 'Toledo' AND state = 'OH';

UPDATE public.restaurants_master SET address = '5221 Monroe St', city = 'Toledo', state = 'OH', lat = 41.7008348, lng = -83.6521952
WHERE name = 'Rack Room Shoes' AND city = 'Toledo' AND state = 'OH';
