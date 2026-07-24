-- =============================================================================
-- Backfill restaurants_master with Mapbox-geocoded real lat/lng.
-- Generated 2026-07-24T08:52:41.419Z via scripts/geocode-seeded-merchants.mjs
-- 141 merchants geocoded; 1 failed.
-- Idempotent UPDATEs by name (OH / Toledo-metro seeds).
-- =============================================================================

UPDATE public.restaurants_master SET address = '3030 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677561, lng = -83.61683
 WHERE lower(trim(name)) = lower(trim('7-Eleven'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('American Eagle'));

UPDATE public.restaurants_master SET address = '5025 Monroe St', city = 'Toledo', state = 'OH', lat = 41.697556, lng = -83.643093
 WHERE lower(trim(name)) = lower(trim('Applebee''s'));

UPDATE public.restaurants_master SET address = '2625 Glendale Ave', city = 'Toledo', state = 'OH', lat = 41.612008, lng = -83.60808
 WHERE lower(trim(name)) = lower(trim('Arby''s'));

UPDATE public.restaurants_master SET address = '215 N Summit St', city = 'Toledo', state = 'OH', lat = 41.650145, lng = -83.534775
 WHERE lower(trim(name)) = lower(trim('Balance Grille'));

UPDATE public.restaurants_master SET address = '4084 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.693064, lng = -83.623272
 WHERE lower(trim(name)) = lower(trim('Bangkok Kitchen'));

UPDATE public.restaurants_master SET address = '3130 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.527348, lng = -83.639699
 WHERE lower(trim(name)) = lower(trim('Bar Louie'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('BareMinerals'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Bath & Body Works'));

UPDATE public.restaurants_master SET address = '116 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.559733, lng = -83.629962
 WHERE lower(trim(name)) = lower(trim('Benchmark Restaurant'));

UPDATE public.restaurants_master SET address = '4501 Monroe St', city = 'Toledo', state = 'OH', lat = 41.688083, lng = -83.619716
 WHERE lower(trim(name)) = lower(trim('Bob Evans'));

UPDATE public.restaurants_master SET address = '125 E Court St', city = 'Bowling Green', state = 'OH', lat = 41.376114, lng = -83.649189
 WHERE lower(trim(name)) = lower(trim('Bowling Green Grill'));

UPDATE public.restaurants_master SET address = '6710 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.675903, lng = -83.704859
 WHERE lower(trim(name)) = lower(trim('Buffalo Wild Wings'));

UPDATE public.restaurants_master SET address = '7447 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.673343, lng = -83.721903
 WHERE lower(trim(name)) = lower(trim('Burger King'));

UPDATE public.restaurants_master SET address = '4260 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.691482, lng = -83.644235
 WHERE lower(trim(name)) = lower(trim('Chick-fil-A'));

UPDATE public.restaurants_master SET address = '5020 Monroe St', city = 'Toledo', state = 'OH', lat = 41.69842, lng = -83.64154
 WHERE lower(trim(name)) = lower(trim('Chili''s'));

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.676794, lng = -83.62334
 WHERE lower(trim(name)) = lower(trim('Chipotle'));

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Holland', state = 'OH', lat = 41.697472, lng = -83.637758
 WHERE lower(trim(name)) = lower(trim('Chuck & Don''s'));

UPDATE public.restaurants_master SET address = '4540 Monroe St', city = 'Toledo', state = 'OH', lat = 41.688987, lng = -83.621638
 WHERE lower(trim(name)) = lower(trim('Circle K'));

UPDATE public.restaurants_master SET address = '3210 Navarre Ave', city = 'Oregon', state = 'OH', lat = 41.636957, lng = -83.472033
 WHERE lower(trim(name)) = lower(trim('Culver''s'));

UPDATE public.restaurants_master SET address = '3901 Monroe St', city = 'Toledo', state = 'OH', lat = 41.676177, lng = -83.594619
 WHERE lower(trim(name)) = lower(trim('CVS'));

UPDATE public.restaurants_master SET address = '3510 N Holland Sylvania Rd', city = 'Toledo', state = 'OH', lat = 41.682316, lng = -83.682504
 WHERE lower(trim(name)) = lower(trim('Dairy Queen'));

UPDATE public.restaurants_master SET address = '7060 Sylvania Ave', city = 'Sylvania', state = 'OH', lat = 41.690452, lng = -83.713074
 WHERE lower(trim(name)) = lower(trim('Dale''s Bar & Grill'));

UPDATE public.restaurants_master SET address = '5475 Monroe St', city = 'Toledo', state = 'OH', lat = 41.705904, lng = -83.664228
 WHERE lower(trim(name)) = lower(trim('Denny''s'));

UPDATE public.restaurants_master SET address = '1515 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.611697, lng = -83.624585
 WHERE lower(trim(name)) = lower(trim('Doc Watson''s'));

UPDATE public.restaurants_master SET address = '5406 N Summit St', city = 'Toledo', state = 'OH', lat = 41.718764, lng = -83.479021
 WHERE lower(trim(name)) = lower(trim('Domino''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('DSW'));

UPDATE public.restaurants_master SET address = '2929 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.67745, lng = -83.615956
 WHERE lower(trim(name)) = lower(trim('Dunkin'''));

UPDATE public.restaurants_master SET address = '1533 E Wooster St', city = 'Bowling Green', state = 'OH', lat = 41.374662, lng = -83.624055
 WHERE lower(trim(name)) = lower(trim('Falcon''s Nest'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Finish Line'));

UPDATE public.restaurants_master SET address = '5208 Monroe St', city = 'Toledo', state = 'OH', lat = 41.701543, lng = -83.650279
 WHERE lower(trim(name)) = lower(trim('Firehouse Subs'));

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.676794, lng = -83.62334
 WHERE lower(trim(name)) = lower(trim('Five Guys'));

UPDATE public.restaurants_master SET address = '100 Madison Ave', city = 'Toledo', state = 'OH', lat = 41.650451, lng = -83.532709
 WHERE lower(trim(name)) = lower(trim('Flap Flap''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Foot Locker'));

UPDATE public.restaurants_master SET address = '614 Adams St', city = 'Toledo', state = 'OH', lat = 41.653973, lng = -83.536205
 WHERE lower(trim(name)) = lower(trim('Fowl & Fodder'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Franklin Park Mall'));

UPDATE public.restaurants_master SET address = '5820 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.676699, lng = -83.681127
 WHERE lower(trim(name)) = lower(trim('GetGo'));

UPDATE public.restaurants_master SET address = '34 S Huron St', city = 'Toledo', state = 'OH', lat = 41.647585, lng = -83.541164
 WHERE lower(trim(name)) = lower(trim('Grumpy''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('H&M'));

UPDATE public.restaurants_master SET address = '1250 Harbor Ave', city = 'Oregon', state = 'OH', lat = 41.720082, lng = -83.494774
 WHERE lower(trim(name)) = lower(trim('Harbor View Grill'));

UPDATE public.restaurants_master SET address = '7001 Spring Meadows Dr', city = 'Holland', state = 'OH', lat = 41.610646, lng = -83.709378
 WHERE lower(trim(name)) = lower(trim('Holland House'));

UPDATE public.restaurants_master SET address = '5401 Monroe St', city = 'Maumee', state = 'OH', lat = 41.70448, lng = -83.66171
 WHERE lower(trim(name)) = lower(trim('Hollywood Feed'));

UPDATE public.restaurants_master SET address = '28 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.646781, lng = -83.538925
 WHERE lower(trim(name)) = lower(trim('Home Slice Pizza'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Hot Topic'));

UPDATE public.restaurants_master SET address = '5216 Airport Hwy', city = 'Toledo', state = 'OH', lat = 41.616634, lng = -83.66497
 WHERE lower(trim(name)) = lower(trim('IHOP'));

UPDATE public.restaurants_master SET address = '117 W Dudley St', city = 'Maumee', state = 'OH', lat = 41.562608, lng = -83.654811
 WHERE lower(trim(name)) = lower(trim('Inside the Five Brewing'));

UPDATE public.restaurants_master SET address = '4558 Monroe St', city = 'Toledo', state = 'OH', lat = 41.689398, lng = -83.621716
 WHERE lower(trim(name)) = lower(trim('Jersey Mike''s'));

UPDATE public.restaurants_master SET address = '3324 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.681491, lng = -83.621616
 WHERE lower(trim(name)) = lower(trim('Jimmy John''s'));

UPDATE public.restaurants_master SET address = '38 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.646508, lng = -83.539097
 WHERE lower(trim(name)) = lower(trim('Kengo Sushi'));

UPDATE public.restaurants_master SET address = '38 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.646508, lng = -83.539097
 WHERE lower(trim(name)) = lower(trim('Kengo Sushi & Yakitori'));

UPDATE public.restaurants_master SET address = '6790 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.67513, lng = -83.706349
 WHERE lower(trim(name)) = lower(trim('KFC'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Kiehl''s'));

UPDATE public.restaurants_master SET address = '4865 Monroe St', city = 'Toledo', state = 'OH', lat = 41.694321, lng = -83.635747
 WHERE lower(trim(name)) = lower(trim('Kohl''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('L''Occitane'));

UPDATE public.restaurants_master SET address = '3201 Levis Commons Blvd', city = 'Perrysburg', state = 'OH', lat = 41.527221, lng = -83.638915
 WHERE lower(trim(name)) = lower(trim('Levis Commons'));

UPDATE public.restaurants_master SET address = '3245 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.720588, lng = -83.622939
 WHERE lower(trim(name)) = lower(trim('Little Caesars'));

UPDATE public.restaurants_master SET address = '3027 Navarre Ave', city = 'Oregon', state = 'OH', lat = 41.636871, lng = -83.476126
 WHERE lower(trim(name)) = lower(trim('Local Bistro'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Lush'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('MAC Cosmetics'));

UPDATE public.restaurants_master SET address = '5453 Monroe St', city = 'Toledo', state = 'OH', lat = 41.705507, lng = -83.664168
 WHERE lower(trim(name)) = lower(trim('Mancy''s Italian Grill'));

UPDATE public.restaurants_master SET address = '953 Phillips Ave', city = 'Toledo', state = 'OH', lat = 41.692167, lng = -83.564957
 WHERE lower(trim(name)) = lower(trim('Mancy''s Steakhouse'));

UPDATE public.restaurants_master SET address = '1516 Adams St', city = 'Toledo', state = 'OH', lat = 41.657574, lng = -83.543856
 WHERE lower(trim(name)) = lower(trim('Manhattan''s Pub ''n Cheer'));

UPDATE public.restaurants_master SET address = '2658 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677897, lng = -83.607444
 WHERE lower(trim(name)) = lower(trim('Marco''s Pizza'));

UPDATE public.restaurants_master SET address = '5245 Monroe St', city = 'Toledo', state = 'OH', lat = 41.701528, lng = -83.654552
 WHERE lower(trim(name)) = lower(trim('Marshalls'));

UPDATE public.restaurants_master SET address = '3005 N Holland Sylvania Rd', city = 'Toledo', state = 'OH', lat = 41.67506, lng = -83.68355
 WHERE lower(trim(name)) = lower(trim('McDonald''s'));

UPDATE public.restaurants_master SET address = '4544 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677033, lng = -83.650641
 WHERE lower(trim(name)) = lower(trim('Miracle Mile Shopping Center'));

UPDATE public.restaurants_master SET address = '4620 Monroe St', city = 'Toledo', state = 'OH', lat = 41.689926, lng = -83.623639
 WHERE lower(trim(name)) = lower(trim('Monroe Street Shopping Center'));

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Perrysburg', state = 'OH', lat = 41.697472, lng = -83.637758
 WHERE lower(trim(name)) = lower(trim('Mud Bay'));

UPDATE public.restaurants_master SET address = '28398 Dixie Hwy', city = 'Perrysburg', state = 'OH', lat = 41.546989, lng = -83.635744
 WHERE lower(trim(name)) = lower(trim('Nagoya Japanese Steakhouse'));

UPDATE public.restaurants_master SET address = '4956 Monroe St', city = 'Toledo', state = 'OH', lat = 41.69794, lng = -83.63944
 WHERE lower(trim(name)) = lower(trim('Nick & Jimmy''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Old Navy'));

UPDATE public.restaurants_master SET address = '5050 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698842, lng = -83.643819
 WHERE lower(trim(name)) = lower(trim('Olive Garden'));

UPDATE public.restaurants_master SET address = '124 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.559434, lng = -83.629746
 WHERE lower(trim(name)) = lower(trim('Original Sub Shop'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Origins'));

UPDATE public.restaurants_master SET address = '3313 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677357, lng = -83.62309
 WHERE lower(trim(name)) = lower(trim('Outback Steakhouse'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('PacSun'));

UPDATE public.restaurants_master SET address = '5045 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698965, lng = -83.644509
 WHERE lower(trim(name)) = lower(trim('Panda Express'));

UPDATE public.restaurants_master SET address = '7115 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.672899, lng = -83.713502
 WHERE lower(trim(name)) = lower(trim('Panera Bread'));

UPDATE public.restaurants_master SET address = '2531 Key St', city = 'Toledo', state = 'OH', lat = 41.59358, lng = -83.645198
 WHERE lower(trim(name)) = lower(trim('Papa John''s'));

UPDATE public.restaurants_master SET address = '17th Street', city = 'Toledo', state = 'OH', lat = 41.655343, lng = -83.547586
 WHERE lower(trim(name)) = lower(trim('Papa Johns'));

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.697472, lng = -83.637758
 WHERE lower(trim(name)) = lower(trim('Pet Food Express'));

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.697472, lng = -83.637758
 WHERE lower(trim(name)) = lower(trim('Pet Supermarket'));

UPDATE public.restaurants_master SET address = '4533 Monroe St', city = 'Toledo', state = 'OH', lat = 41.687321, lng = -83.621351
 WHERE lower(trim(name)) = lower(trim('Pet Supplies Plus'));

UPDATE public.restaurants_master SET address = '4940 Monroe St', city = 'Toledo', state = 'OH', lat = 41.697472, lng = -83.637758
 WHERE lower(trim(name)) = lower(trim('Pet Valu'));

UPDATE public.restaurants_master SET address = '4024 Talmadge Rd', city = 'Toledo', state = 'OH', lat = 41.69158, lng = -83.644622
 WHERE lower(trim(name)) = lower(trim('Petco'));

UPDATE public.restaurants_master SET address = '5251 Monroe St', city = 'Toledo', state = 'OH', lat = 41.701819, lng = -83.652495
 WHERE lower(trim(name)) = lower(trim('PetSmart'));

UPDATE public.restaurants_master SET address = '1116 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.692892, lng = -83.56749
 WHERE lower(trim(name)) = lower(trim('Pizza Hut'));

UPDATE public.restaurants_master SET address = '519 Monroe St', city = 'Toledo', state = 'OH', lat = 41.64949, lng = -83.538922
 WHERE lower(trim(name)) = lower(trim('Pizza Papalis'));

UPDATE public.restaurants_master SET address = '3214 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.679244, lng = -83.622396
 WHERE lower(trim(name)) = lower(trim('Popeyes'));

UPDATE public.restaurants_master SET address = '3305 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.676794, lng = -83.62334
 WHERE lower(trim(name)) = lower(trim('Qdoba'));

UPDATE public.restaurants_master SET address = '5857 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.715514, lng = -83.684684
 WHERE lower(trim(name)) = lower(trim('QQ Kitchen'));

UPDATE public.restaurants_master SET address = '5221 Monroe St', city = 'Toledo', state = 'OH', lat = 41.700775, lng = -83.652177
 WHERE lower(trim(name)) = lower(trim('Rack Room Shoes'));

UPDATE public.restaurants_master SET address = '5150 Monroe St', city = 'Toledo', state = 'OH', lat = 41.700255, lng = -83.647326
 WHERE lower(trim(name)) = lower(trim('Raising Cane''s'));

UPDATE public.restaurants_master SET address = '1321 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.721426, lng = -83.57599
 WHERE lower(trim(name)) = lower(trim('Red Lobster'));

UPDATE public.restaurants_master SET address = '5109 Monroe St', city = 'Toledo', state = 'OH', lat = 41.699778, lng = -83.646643
 WHERE lower(trim(name)) = lower(trim('Red Robin'));

UPDATE public.restaurants_master SET address = '2929 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.67745, lng = -83.615956
 WHERE lower(trim(name)) = lower(trim('Rite Aid'));

UPDATE public.restaurants_master SET address = '606 N McCord Rd', city = 'Toledo', state = 'OH', lat = 41.647025, lng = -83.702981
 WHERE lower(trim(name)) = lower(trim('Rosie''s Italian Grille'));

UPDATE public.restaurants_master SET address = '5245 Monroe St', city = 'Toledo', state = 'OH', lat = 41.701528, lng = -83.654552
 WHERE lower(trim(name)) = lower(trim('Ross'));

UPDATE public.restaurants_master SET address = '946 Phillips Ave', city = 'Toledo', state = 'OH', lat = 41.69242, lng = -83.56463
 WHERE lower(trim(name)) = lower(trim('Rudy''s Hot Dog'));

UPDATE public.restaurants_master SET address = '1802 S Reynolds Rd', city = 'Toledo', state = 'OH', lat = 41.606606, lng = -83.664796
 WHERE lower(trim(name)) = lower(trim('San Marcos Mexican'));

UPDATE public.restaurants_master SET address = '2103 N Reynolds Rd', city = 'Toledo', state = 'OH', lat = 41.660624, lng = -83.668136
 WHERE lower(trim(name)) = lower(trim('Schmucker''s Restaurant'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Sephora'));

UPDATE public.restaurants_master SET address = '7611 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.673771, lng = -83.726237
 WHERE lower(trim(name)) = lower(trim('Sheetz'));

UPDATE public.restaurants_master SET address = '5221 Monroe St', city = 'Toledo', state = 'OH', lat = 41.700775, lng = -83.652177
 WHERE lower(trim(name)) = lower(trim('Shoe Carnival'));

UPDATE public.restaurants_master SET address = '5111 Monroe St', city = 'Toledo', state = 'OH', lat = 41.699958, lng = -83.648151
 WHERE lower(trim(name)) = lower(trim('Shorty''s True American Roadhouse'));

UPDATE public.restaurants_master SET address = '4330 N Summit St', city = 'Toledo', state = 'OH', lat = 41.69796, lng = -83.479524
 WHERE lower(trim(name)) = lower(trim('Sonic'));

UPDATE public.restaurants_master SET address = '2060 S Byrne Rd', city = 'Toledo', state = 'OH', lat = 41.600783, lng = -83.624378
 WHERE lower(trim(name)) = lower(trim('Southland Shopping Center'));

UPDATE public.restaurants_master SET address = '3800 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677016, lng = -83.644959
 WHERE lower(trim(name)) = lower(trim('Speedway'));

UPDATE public.restaurants_master SET address = '1600 Spring Meadows Dr', city = 'Holland', state = 'OH', lat = 41.613239, lng = -83.697777
 WHERE lower(trim(name)) = lower(trim('Spring Meadows'));

UPDATE public.restaurants_master SET address = '1700 S Reynolds Rd', city = 'Maumee', state = 'OH', lat = 41.608522, lng = -83.664792
 WHERE lower(trim(name)) = lower(trim('Star Diner'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Starbucks'));

UPDATE public.restaurants_master SET address = '6710 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.675903, lng = -83.704859
 WHERE lower(trim(name)) = lower(trim('Steak ''n Shake'));

UPDATE public.restaurants_master SET address = '3324 Secor Rd', city = 'Toledo', state = 'OH', lat = 41.681491, lng = -83.621616
 WHERE lower(trim(name)) = lower(trim('Subway'));

UPDATE public.restaurants_master SET address = '219 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.558785, lng = -83.628644
 WHERE lower(trim(name)) = lower(trim('Swig'));

UPDATE public.restaurants_master SET address = '1220 W Alexis Rd', city = 'Toledo', state = 'OH', lat = 41.72187, lng = -83.571936
 WHERE lower(trim(name)) = lower(trim('Taco Bell'));

UPDATE public.restaurants_master SET address = '5225 Monroe St', city = 'Toledo', state = 'OH', lat = 41.699137, lng = -83.654311
 WHERE lower(trim(name)) = lower(trim('Target'));

UPDATE public.restaurants_master SET address = '4905 Monroe St', city = 'Toledo', state = 'OH', lat = 41.696313, lng = -83.637972
 WHERE lower(trim(name)) = lower(trim('Texas Roadhouse'));

UPDATE public.restaurants_master SET address = '1701 Adams St', city = 'Toledo', state = 'OH', lat = 41.658065, lng = -83.545568
 WHERE lower(trim(name)) = lower(trim('The Attic on Adams'));

UPDATE public.restaurants_master SET address = '4082 Monroe St', city = 'Toledo', state = 'OH', lat = 41.679642, lng = -83.601535
 WHERE lower(trim(name)) = lower(trim('The Beirut'));

UPDATE public.restaurants_master SET address = '601 Monroe St', city = 'Toledo', state = 'OH', lat = 41.649635, lng = -83.539364
 WHERE lower(trim(name)) = lower(trim('The Blarney Irish Pub'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('The Body Shop'));

UPDATE public.restaurants_master SET address = '5702 Main St', city = 'Sylvania', state = 'OH', lat = 41.717119, lng = -83.703141
 WHERE lower(trim(name)) = lower(trim('The Flying Joe'));

UPDATE public.restaurants_master SET address = '3100 Main St', city = 'Maumee', state = 'OH', lat = 41.546948, lng = -83.703905
 WHERE lower(trim(name)) = lower(trim('The Shops at Fallen Timbers'));

UPDATE public.restaurants_master SET address = '3315 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.675602, lng = -83.623593
 WHERE lower(trim(name)) = lower(trim('TJ Maxx'));

UPDATE public.restaurants_master SET address = '5320 Airport Hwy', city = 'Toledo', state = 'OH', lat = 41.616605, lng = -83.666968
 WHERE lower(trim(name)) = lower(trim('Toledo Town Center'));

UPDATE public.restaurants_master SET address = '1902 Front St', city = 'Toledo', state = 'OH', lat = 41.659952, lng = -83.502189
 WHERE lower(trim(name)) = lower(trim('Tony Packo''s'));

UPDATE public.restaurants_master SET address = '3301 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.67626, lng = -83.62368
 WHERE lower(trim(name)) = lower(trim('Ulta Beauty'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Unleashed by Petco'));

UPDATE public.restaurants_master SET address = '309 Conant St', city = 'Maumee', state = 'OH', lat = 41.562286, lng = -83.653835
 WHERE lower(trim(name)) = lower(trim('Village Idiot'));

UPDATE public.restaurants_master SET address = '2520 W Sylvania Ave', city = 'Toledo', state = 'OH', lat = 41.692156, lng = -83.604409
 WHERE lower(trim(name)) = lower(trim('Walgreen''s'));

UPDATE public.restaurants_master SET address = '1355 S McCord Rd', city = 'Holland', state = 'OH', lat = 41.616438, lng = -83.699341
 WHERE lower(trim(name)) = lower(trim('Walmart'));

UPDATE public.restaurants_master SET address = '4550 Heatherdowns Blvd', city = 'Toledo', state = 'OH', lat = 41.59566, lng = -83.64931
 WHERE lower(trim(name)) = lower(trim('Wawa'));

UPDATE public.restaurants_master SET address = '1859 Laskey Rd', city = 'Toledo', state = 'OH', lat = 41.706479, lng = -83.590101
 WHERE lower(trim(name)) = lower(trim('Wendy''s'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Westfield Franklin Park'));

UPDATE public.restaurants_master SET address = '3410 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677355, lng = -83.626603
 WHERE lower(trim(name)) = lower(trim('Westgate Village Shopping Center'));

UPDATE public.restaurants_master SET address = '1615 Cherry St', city = 'Toledo', state = 'OH', lat = 41.66468, lng = -83.53893
 WHERE lower(trim(name)) = lower(trim('White Castle'));

UPDATE public.restaurants_master SET address = '3330 W Central Ave', city = 'Toledo', state = 'OH', lat = 41.677831, lng = -83.624113
 WHERE lower(trim(name)) = lower(trim('Wingstop'));

UPDATE public.restaurants_master SET address = '3725 Williston Rd', city = 'Northwood', state = 'OH', lat = 41.605867, lng = -83.46224
 WHERE lower(trim(name)) = lower(trim('Woodville Mall'));

UPDATE public.restaurants_master SET address = '2 S St Clair St', city = 'Toledo', state = 'OH', lat = 41.647312, lng = -83.538445
 WHERE lower(trim(name)) = lower(trim('Ye Olde Durty Bird'));

UPDATE public.restaurants_master SET address = '20 Louisiana Ave', city = 'Perrysburg', state = 'OH', lat = 41.551003, lng = -83.623814
 WHERE lower(trim(name)) = lower(trim('Zingo''s Mediterranean'));

UPDATE public.restaurants_master SET address = '5001 Monroe St', city = 'Toledo', state = 'OH', lat = 41.698582, lng = -83.643256
 WHERE lower(trim(name)) = lower(trim('Zumiez'));

-- FAILED TO GEOCODE (manual follow-up):
-- Cracker Barrel: Cracker Barrel, 1150 Cracker Barrel Rd, Perrysburg, OH

-- Manual: Mapbox lacked a POI hit for this storefront; coords from verified
-- Perrysburg Cracker Barrel listing (prior OSM/store-locator backfill 20260421).
UPDATE public.restaurants_master SET address = '1150 Cracker Barrel Rd', city = 'Perrysburg', state = 'OH', lat = 41.5480127, lng = -83.6445102
 WHERE lower(trim(name)) = lower(trim('Cracker Barrel'));
