-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor.
-- Sets logo_url and image_url from Brandfetch CDN (clean SVG/PNG brand assets).
-- Pattern: https://cdn.brandfetch.io/{domain}/logo
-- No generic fallback; rows without a logo stay NULL.
-- =============================================================================

-- Restaurant logos (Brandfetch)
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/mcdonalds.com/logo', image_url = logo_url WHERE name = 'McDonald''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/wendys.com/logo', image_url = logo_url WHERE name = 'Wendy''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/bk.com/logo', image_url = logo_url WHERE name = 'Burger King';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/tacobell.com/logo', image_url = logo_url WHERE name = 'Taco Bell';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/kfc.com/logo', image_url = logo_url WHERE name = 'KFC';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/subway.com/logo', image_url = logo_url WHERE name = 'Subway';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/chipotle.com/logo', image_url = logo_url WHERE name = 'Chipotle';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/fiveguys.com/logo', image_url = logo_url WHERE name = 'Five Guys';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/popeyes.com/logo', image_url = logo_url WHERE name = 'Popeyes';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/chick-fil-a.com/logo', image_url = logo_url WHERE name = 'Chick-fil-A';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/panerabread.com/logo', image_url = logo_url WHERE name = 'Panera Bread';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/jimmyjohns.com/logo', image_url = logo_url WHERE name = 'Jimmy John''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/littlecaesars.com/logo', image_url = logo_url WHERE name = 'Little Caesars';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/pizzahut.com/logo', image_url = logo_url WHERE name = 'Pizza Hut';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/dominos.com/logo', image_url = logo_url WHERE name = 'Domino''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/dairyqueen.com/logo', image_url = logo_url WHERE name = 'Dairy Queen';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/wingstop.com/logo', image_url = logo_url WHERE name = 'Wingstop';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/raisingcanes.com/logo', image_url = logo_url WHERE name = 'Raising Cane''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/qdoba.com/logo', image_url = logo_url WHERE name = 'Qdoba';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/firehousesubs.com/logo', image_url = logo_url WHERE name = 'Firehouse Subs';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/jerseymikes.com/logo', image_url = logo_url WHERE name = 'Jersey Mike''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/culvers.com/logo', image_url = logo_url WHERE name = 'Culver''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/buffalowildwings.com/logo', image_url = logo_url WHERE name = 'Buffalo Wild Wings';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/whitecastle.com/logo', image_url = logo_url WHERE name = 'White Castle';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/steaknshake.com/logo', image_url = logo_url WHERE name = 'Steak ''n Shake';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/marcos.com/logo', image_url = logo_url WHERE name = 'Marco''s Pizza';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/papajohns.com/logo', image_url = logo_url WHERE name = 'Papa Johns';
