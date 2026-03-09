-- ============================================================================
-- Mall/shopping center card images: real exterior photos from local area.
-- Sourced from Wikimedia Commons (CC BY-SA 4.0 / CC BY 2.0). These show
-- the actual malls/shopping centers so cards display outside photos, not
-- generic stock. Customer app and desktop use image_url/logo_url for cards.
-- ============================================================================

-- Westfield Franklin Park (Toledo) – Franklin Park Mall driveway/sign, Macy's in background (Aug 2021)
UPDATE public.restaurants_master
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Franklin_Park_Mall_Driveway%2C_August_2021.jpg/1280px-Franklin_Park_Mall_Driveway%2C_August_2021.jpg',
    logo_url  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Franklin_Park_Mall_Driveway%2C_August_2021.jpg/640px-Franklin_Park_Mall_Driveway%2C_August_2021.jpg'
WHERE name = 'Westfield Franklin Park' AND marketplace_type = 'mall';

-- Franklin Park Mall (if present from earlier seed – same location)
UPDATE public.restaurants_master
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Franklin_Park_Mall_Driveway%2C_August_2021.jpg/1280px-Franklin_Park_Mall_Driveway%2C_August_2021.jpg',
    logo_url  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Franklin_Park_Mall_Driveway%2C_August_2021.jpg/640px-Franklin_Park_Mall_Driveway%2C_August_2021.jpg'
WHERE name = 'Franklin Park Mall' AND marketplace_type = 'mall';

-- The Shops at Fallen Timbers (Maumee) – exterior shops/architecture (Aug 2022)
UPDATE public.restaurants_master
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/The_Shops_at_Fallen_Timbers%2C_August_2022.jpg/1280px-The_Shops_at_Fallen_Timbers%2C_August_2022.jpg',
    logo_url  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/The_Shops_at_Fallen_Timbers%2C_August_2022.jpg/640px-The_Shops_at_Fallen_Timbers%2C_August_2022.jpg'
WHERE name = 'The Shops at Fallen Timbers' AND marketplace_type = 'mall';

-- Levis Commons (Perrysburg) – twilight exterior (May 2019)
UPDATE public.restaurants_master
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Levis_Commons.jpg/1280px-Levis_Commons.jpg',
    logo_url  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Levis_Commons.jpg/640px-Levis_Commons.jpg'
WHERE name = 'Levis Commons' AND marketplace_type = 'mall';

-- Woodville Mall (Northwood) – exterior storefront (Mar 2014; mall since demolished, historical photo)
UPDATE public.restaurants_master
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Woodville_Mall_-_Northwood%2C_Ohio.jpg/1280px-Woodville_Mall_-_Northwood%2C_Ohio.jpg',
    logo_url  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Woodville_Mall_-_Northwood%2C_Ohio.jpg/640px-Woodville_Mall_-_Northwood%2C_Ohio.jpg'
WHERE name = 'Woodville Mall' AND marketplace_type = 'mall';
