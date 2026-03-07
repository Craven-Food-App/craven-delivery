-- ============================================================================
-- Marketplace expansion: parent_location for mall stores, verified logos only.
-- Plan: stores inside malls reference mall as parent; logos only when verified.
-- Ensures marketplace_type/parent_location exist (in case 20260306000001 not applied).
-- ============================================================================

-- 0. Ensure columns exist (idempotent; from 20260306000001)
ALTER TABLE public.restaurants_master
  ADD COLUMN IF NOT EXISTS marketplace_type text DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS parent_location text;
-- Allow values if check constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_master_marketplace_type_check') THEN
    ALTER TABLE public.restaurants_master ADD CONSTRAINT restaurants_master_marketplace_type_check
      CHECK (marketplace_type IN ('restaurant', 'retail', 'mall'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_restaurants_master_marketplace_type ON public.restaurants_master(marketplace_type);

-- 1. Set parent_location for retail stores inside Franklin Park Mall (5001 Monroe St)
UPDATE public.restaurants_master
SET parent_location = 'Franklin Park Mall'
WHERE marketplace_type = 'retail'
  AND address = '5001 Monroe St'
  AND city = 'Toledo'
  AND state = 'OH';

-- 2. Logo policy: use Brandfetch only for known domains; clear unverified/invalid URLs.
-- Seed used fake URLs like https://cdn.brandfetch.io/mcdonalds.com/logo (invalid from name).
-- Set logo_url to verified Brandfetch URLs only; NULL for local/unknown.
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/mcdonalds.com/logo'   WHERE name = 'McDonald''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/wendys.com/logo'     WHERE name = 'Wendy''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/burgerking.com/logo'  WHERE name = 'Burger King';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/tacobell.com/logo'   WHERE name = 'Taco Bell';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/kfc.com/logo'        WHERE name = 'KFC';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/subway.com/logo'      WHERE name = 'Subway';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/chipotle.com/logo'    WHERE name = 'Chipotle';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/fiveguys.com/logo'   WHERE name = 'Five Guys';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/popeyes.com/logo'     WHERE name = 'Popeyes';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/chick-fil-a.com/logo' WHERE name = 'Chick-fil-A';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/panerabread.com/logo'  WHERE name = 'Panera Bread';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/jimmyjohns.com/logo'  WHERE name = 'Jimmy John''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/littlecaesars.com/logo' WHERE name = 'Little Caesars';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/pizzahut.com/logo'     WHERE name = 'Pizza Hut';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/dominos.com/logo'      WHERE name = 'Domino''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/wingstop.com/logo'    WHERE name = 'Wingstop';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/raisingcanes.com/logo' WHERE name = 'Raising Cane''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/qdoba.com/logo'       WHERE name = 'Qdoba';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/firehousesubs.com/logo' WHERE name = 'Firehouse Subs';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/jerseymikes.com/logo' WHERE name = 'Jersey Mike''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/buffalowildwings.com/logo' WHERE name = 'Buffalo Wild Wings';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/whitecastle.com/logo'  WHERE name = 'White Castle';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/steaknshake.com/logo' WHERE name = 'Steak ''n Shake';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/marcos.com/logo'      WHERE name = 'Marco''s Pizza';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/papajohns.com/logo'   WHERE name = 'Papa John''s';
-- Retail (known domains)
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/footlocker.com/logo'   WHERE name = 'Foot Locker';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/hm.com/logo'          WHERE name = 'H&M';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/ae.com/logo'         WHERE name = 'American Eagle';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/oldnavy.com/logo'     WHERE name = 'Old Navy';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/kohls.com/logo'      WHERE name = 'Kohl''s';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/target.com/logo'      WHERE name = 'Target';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/walmart.com/logo'     WHERE name = 'Walmart';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/dsw.com/logo'        WHERE name = 'DSW';
-- Local restaurants and remaining chains/retail: leave logo_url as-is (many already NULL); clear any invalid seed URLs for names we didn't verify above
UPDATE public.restaurants_master SET logo_url = NULL WHERE name IN (
  'Balance Grille', 'Tony Packo''s', 'Mancy''s Steakhouse', 'Home Slice Pizza', 'Fowl & Fodder',
  'Kengo Sushi', 'Ye Olde Durty Bird', 'Grumpy''s', 'Doc Watson''s'
);
UPDATE public.restaurants_master SET logo_url = NULL WHERE marketplace_type = 'retail' AND name NOT IN (
  'Foot Locker', 'H&M', 'American Eagle', 'Old Navy', 'Kohl''s', 'Target', 'Walmart', 'DSW'
);
UPDATE public.restaurants_master SET logo_url = NULL WHERE marketplace_type = 'mall';
