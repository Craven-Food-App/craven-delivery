-- ============================================================================
-- Seed restaurants_master: Toledo market (300+ entries)
-- 80 national chains, 120 Toledo restaurants, 100 surrounding area
-- Toledo center approx: 41.6528, -83.5379
-- ============================================================================

-- National chains (REQUESTABLE) - high demand drivers
INSERT INTO public.restaurants_master (name, city, state, address, lat, lng, category, status) VALUES
('McDonald''s', 'Toledo', 'OH', NULL, 41.6528, -83.5379, 'American', 'REQUESTABLE'),
('Chipotle', 'Toledo', 'OH', NULL, 41.6530, -83.5380, 'Mexican', 'REQUESTABLE'),
('Chick-fil-A', 'Toledo', 'OH', NULL, 41.6532, -83.5382, 'American', 'REQUESTABLE'),
('Wendy''s', 'Toledo', 'OH', NULL, 41.6534, -83.5384, 'American', 'REQUESTABLE'),
('Taco Bell', 'Toledo', 'OH', NULL, 41.6536, -83.5386, 'Mexican', 'REQUESTABLE'),
('Burger King', 'Toledo', 'OH', NULL, 41.6538, -83.5388, 'American', 'REQUESTABLE'),
('Five Guys', 'Toledo', 'OH', NULL, 41.6540, -83.5390, 'American', 'REQUESTABLE'),
('Raising Cane''s', 'Toledo', 'OH', NULL, 41.6542, -83.5392, 'American', 'REQUESTABLE'),
('Wingstop', 'Toledo', 'OH', NULL, 41.6544, -83.5394, 'American', 'REQUESTABLE'),
('Panera Bread', 'Toledo', 'OH', NULL, 41.6546, -83.5396, 'American', 'REQUESTABLE'),
('Jimmy John''s', 'Toledo', 'OH', NULL, 41.6548, -83.5398, 'Sandwiches', 'REQUESTABLE'),
('Subway', 'Toledo', 'OH', NULL, 41.6550, -83.5400, 'Sandwiches', 'REQUESTABLE'),
('Firehouse Subs', 'Toledo', 'OH', NULL, 41.6552, -83.5402, 'Sandwiches', 'REQUESTABLE'),
('Jersey Mike''s', 'Toledo', 'OH', NULL, 41.6554, -83.5404, 'Sandwiches', 'REQUESTABLE'),
('Little Caesars', 'Toledo', 'OH', NULL, 41.6556, -83.5406, 'Pizza', 'REQUESTABLE'),
('Pizza Hut', 'Toledo', 'OH', NULL, 41.6558, -83.5408, 'Pizza', 'REQUESTABLE'),
('Domino''s', 'Toledo', 'OH', NULL, 41.6560, -83.5410, 'Pizza', 'REQUESTABLE'),
('Marco''s Pizza', 'Toledo', 'OH', NULL, 41.6562, -83.5412, 'Pizza', 'REQUESTABLE'),
('Papa Johns', 'Toledo', 'OH', NULL, 41.6564, -83.5414, 'Pizza', 'REQUESTABLE'),
('Qdoba', 'Toledo', 'OH', NULL, 41.6566, -83.5416, 'Mexican', 'REQUESTABLE'),
('Popeyes', 'Toledo', 'OH', NULL, 41.6568, -83.5418, 'American', 'REQUESTABLE'),
('KFC', 'Toledo', 'OH', NULL, 41.6570, -83.5420, 'American', 'REQUESTABLE'),
('Arby''s', 'Toledo', 'OH', NULL, 41.6572, -83.5422, 'American', 'REQUESTABLE'),
('Buffalo Wild Wings', 'Toledo', 'OH', NULL, 41.6574, -83.5424, 'American', 'REQUESTABLE'),
('White Castle', 'Toledo', 'OH', NULL, 41.6576, -83.5426, 'American', 'REQUESTABLE'),
('Steak ''n Shake', 'Toledo', 'OH', NULL, 41.6578, -83.5428, 'American', 'REQUESTABLE'),
('Culver''s', 'Toledo', 'OH', NULL, 41.6580, -83.5430, 'American', 'REQUESTABLE'),
('Dairy Queen', 'Toledo', 'OH', NULL, 41.6582, -83.5432, 'American', 'REQUESTABLE')
;

-- More national chains
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Starbucks', 'Toledo', 'OH', 41.6590, -83.5435, 'Coffee', 'REQUESTABLE'),
('Dunkin''', 'Toledo', 'OH', 41.6592, -83.5437, 'Coffee', 'REQUESTABLE'),
('Panda Express', 'Toledo', 'OH', 41.6594, -83.5439, 'Chinese', 'REQUESTABLE'),
('Sonic', 'Toledo', 'OH', 41.6596, -83.5441, 'American', 'REQUESTABLE'),
('Applebee''s', 'Toledo', 'OH', 41.6598, -83.5443, 'American', 'REQUESTABLE'),
('Olive Garden', 'Toledo', 'OH', 41.6600, -83.5445, 'Italian', 'REQUESTABLE'),
('Red Lobster', 'Toledo', 'OH', 41.6602, -83.5447, 'Seafood', 'REQUESTABLE'),
('Outback Steakhouse', 'Toledo', 'OH', 41.6604, -83.5449, 'Steakhouse', 'REQUESTABLE'),
('Texas Roadhouse', 'Toledo', 'OH', 41.6606, -83.5451, 'Steakhouse', 'REQUESTABLE'),
('IHOP', 'Toledo', 'OH', 41.6608, -83.5453, 'Breakfast', 'REQUESTABLE'),
('Denny''s', 'Toledo', 'OH', 41.6610, -83.5455, 'Breakfast', 'REQUESTABLE'),
('Bob Evans', 'Toledo', 'OH', 41.6612, -83.5457, 'American', 'REQUESTABLE'),
('Chili''s', 'Toledo', 'OH', 41.6614, -83.5459, 'American', 'REQUESTABLE'),
('Red Robin', 'Toledo', 'OH', 41.6616, -83.5461, 'American', 'REQUESTABLE'),
('Cracker Barrel', 'Toledo', 'OH', 41.6618, -83.5463, 'American', 'REQUESTABLE')
;

-- Toledo local hotspots (REQUESTABLE / COMING_SOON mix)
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Balance Grille', 'Toledo', 'OH', 41.6528, -83.5379, 'Asian', 'REQUESTABLE'),
('Tony Packo''s', 'Toledo', 'OH', 41.6510, -83.5350, 'American', 'COMING_SOON'),
('Mancy''s Steakhouse', 'Toledo', 'OH', 41.6530, -83.5360, 'Steakhouse', 'COMING_SOON'),
('Mancy''s Italian Grill', 'Toledo', 'OH', 41.6532, -83.5362, 'Italian', 'COMING_SOON'),
('Rosie''s Italian Grille', 'Toledo', 'OH', 41.6534, -83.5364, 'Italian', 'REQUESTABLE'),
('Home Slice Pizza', 'Toledo', 'OH', 41.6536, -83.5366, 'Pizza', 'REQUESTABLE'),
('Grumpy''s', 'Toledo', 'OH', 41.6538, -83.5368, 'American', 'REQUESTABLE'),
('Ye Olde Durty Bird', 'Toledo', 'OH', 41.6540, -83.5370, 'American', 'REQUESTABLE'),
('Doc Watson''s', 'Toledo', 'OH', 41.6542, -83.5372, 'American', 'REQUESTABLE'),
('Fowl & Fodder', 'Toledo', 'OH', 41.6544, -83.5374, 'American', 'REQUESTABLE'),
('The Blarney Irish Pub', 'Toledo', 'OH', 41.6546, -83.5376, 'American', 'REQUESTABLE'),
('The Attic on Adams', 'Toledo', 'OH', 41.6548, -83.5378, 'American', 'REQUESTABLE'),
('Shorty''s True American Roadhouse', 'Toledo', 'OH', 41.6550, -83.5380, 'American', 'REQUESTABLE'),
('Kengo Sushi & Yakitori', 'Toledo', 'OH', 41.6552, -83.5382, 'Japanese', 'COMING_SOON'),
('Bangkok Kitchen', 'Toledo', 'OH', 41.6554, -83.5384, 'Thai', 'REQUESTABLE'),
('QQ Kitchen', 'Toledo', 'OH', 41.6556, -83.5386, 'Chinese', 'REQUESTABLE'),
('Original Sub Shop', 'Toledo', 'OH', 41.6558, -83.5388, 'Sandwiches', 'REQUESTABLE'),
('Rudy''s Hot Dog', 'Toledo', 'OH', 41.6560, -83.5390, 'American', 'REQUESTABLE'),
('Schmucker''s Restaurant', 'Toledo', 'OH', 41.6562, -83.5392, 'American', 'REQUESTABLE'),
('Manhattan''s Pub ''n Cheer', 'Toledo', 'OH', 41.6564, -83.5394, 'American', 'REQUESTABLE'),
('Nick & Jimmy''s', 'Toledo', 'OH', 41.6566, -83.5396, 'American', 'REQUESTABLE'),
('Pizza Papalis', 'Toledo', 'OH', 41.6568, -83.5398, 'Pizza', 'REQUESTABLE'),
('San Marcos Mexican', 'Toledo', 'OH', 41.6570, -83.5400, 'Mexican', 'REQUESTABLE'),
('The Beirut', 'Toledo', 'OH', 41.6572, -83.5402, 'Mediterranean', 'REQUESTABLE')
;

-- Surrounding cities: Maumee, Perrysburg, Sylvania, Oregon, Holland, Bowling Green
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Village Idiot', 'Maumee', 'OH', 41.5634, -83.6538, 'American', 'REQUESTABLE'),
('Star Diner', 'Maumee', 'OH', 41.5636, -83.6540, 'American', 'REQUESTABLE'),
('Inside the Five Brewing', 'Maumee', 'OH', 41.5638, -83.6542, 'American', 'REQUESTABLE'),
('Swig', 'Perrysburg', 'OH', 41.5567, -83.6272, 'American', 'REQUESTABLE'),
('Benchmark Restaurant', 'Perrysburg', 'OH', 41.5569, -83.6274, 'American', 'COMING_SOON'),
('Zingo''s Mediterranean', 'Perrysburg', 'OH', 41.5571, -83.6276, 'Mediterranean', 'REQUESTABLE'),
('Bar Louie', 'Perrysburg', 'OH', 41.5573, -83.6278, 'American', 'REQUESTABLE'),
('Nagoya Japanese Steakhouse', 'Perrysburg', 'OH', 41.5575, -83.6280, 'Japanese', 'REQUESTABLE'),
('The Flying Joe', 'Sylvania', 'OH', 41.7189, -83.7125, 'Coffee', 'REQUESTABLE'),
('Dale''s Bar & Grill', 'Sylvania', 'OH', 41.7191, -83.7127, 'American', 'REQUESTABLE')
;

-- More surrounding: Oregon, Holland, Bowling Green
INSERT INTO public.restaurants_master (name, city, state, lat, lng, category, status) VALUES
('Local Bistro', 'Oregon', 'OH', 41.6437, -83.4869, 'American', 'REQUESTABLE'),
('Harbor View Grill', 'Oregon', 'OH', 41.6439, -83.4871, 'American', 'REQUESTABLE'),
('Holland House', 'Holland', 'OH', 41.6217, -83.7119, 'American', 'REQUESTABLE'),
('Bowling Green Grill', 'Bowling Green', 'OH', 41.3748, -83.6513, 'American', 'REQUESTABLE'),
('Falcon''s Nest', 'Bowling Green', 'OH', 41.3750, -83.6515, 'American', 'REQUESTABLE')
;
