-- ============================================================================
-- Backfill seeded merchant logos from curated Brandfetch domains.
-- Does NOT overwrite hand-uploaded Supabase "seed logos" storage URLs.
-- Overwrites null/empty logos and prior naive brandfetch guesses.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_seeded_merchant_logos(
  p_overwrite_brandfetch boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_master_updated int := 0;
  v_restaurants_updated int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND lower(ur.role::text) IN ('admin', 'ceo', 'super_admin', 'coo', 'cfo', 'chro')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.exec_users eu
      WHERE eu.user_id = v_uid
        AND eu.is_approved IS DISTINCT FROM false
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH domains(name, domain) AS (
    VALUES
      -- QSR
      ('McDonald''s', 'mcdonalds.com'),
      ('McDonalds', 'mcdonalds.com'),
      ('Wendy''s', 'wendys.com'),
      ('Burger King', 'burgerking.com'),
      ('Taco Bell', 'tacobell.com'),
      ('KFC', 'kfc.com'),
      ('Subway', 'subway.com'),
      ('Chipotle', 'chipotle.com'),
      ('Five Guys', 'fiveguys.com'),
      ('Popeyes', 'popeyes.com'),
      ('Chick-fil-A', 'chick-fil-a.com'),
      ('Panera Bread', 'panerabread.com'),
      ('Jimmy John''s', 'jimmyjohns.com'),
      ('Little Caesars', 'littlecaesars.com'),
      ('Pizza Hut', 'pizzahut.com'),
      ('Domino''s', 'dominos.com'),
      ('Wingstop', 'wingstop.com'),
      ('Raising Cane''s', 'raisingcanes.com'),
      ('Qdoba', 'qdoba.com'),
      ('Firehouse Subs', 'firehousesubs.com'),
      ('Jersey Mike''s', 'jerseymikes.com'),
      ('Culver''s', 'culvers.com'),
      ('Buffalo Wild Wings', 'buffalowildwings.com'),
      ('White Castle', 'whitecastle.com'),
      ('Steak ''n Shake', 'steaknshake.com'),
      ('Marco''s Pizza', 'marcos.com'),
      ('Papa John''s', 'papajohns.com'),
      ('Papa Johns', 'papajohns.com'),
      ('Dairy Queen', 'dairyqueen.com'),
      ('Waffle House', 'wafflehouse.com'),
      ('Jack in the Box', 'jackinthebox.com'),
      ('Whataburger', 'whataburger.com'),
      ('Zaxby''s', 'zaxbys.com'),
      ('Hardee''s', 'hardees.com'),
      ('Carl''s Jr.', 'carlsjr.com'),
      ('Long John Silver''s', 'ljsilvers.com'),
      ('Noodles & Company', 'noodles.com'),
      ('Moe''s Southwest Grill', 'moes.com'),
      ('Shake Shack', 'shakeshack.com'),
      ('Portillo''s', 'portillos.com'),
      ('Tropical Smoothie Cafe', 'tropicalsmoothiecafe.com'),
      ('Checkers', 'checkers.com'),
      ('Rally''s', 'checkers.com'),
      ('Del Taco', 'deltaco.com'),
      ('Church''s Chicken', 'churchs.com'),
      ('Bojangles', 'bojangles.com'),
      ('Fazoli''s', 'fazolis.com'),
      ('Golden Corral', 'goldencorral.com'),
      ('Krispy Kreme', 'krispykreme.com'),
      ('Tim Hortons', 'timhortons.com'),
      ('Sonic', 'sonicdrivein.com'),
      ('Arby''s', 'arbys.com'),
      ('Starbucks', 'starbucks.com'),
      ('Dunkin''', 'dunkindonuts.com'),
      ('Panda Express', 'pandaexpress.com'),
      -- Casual
      ('Applebee''s', 'applebees.com'),
      ('Chili''s', 'chilis.com'),
      ('Olive Garden', 'olivegarden.com'),
      ('Outback Steakhouse', 'outback.com'),
      ('Red Lobster', 'redlobster.com'),
      ('Red Robin', 'redrobin.com'),
      ('Red Robbin', 'redrobin.com'),
      ('Cracker Barrel', 'crackerbarrel.com'),
      ('Denny''s', 'dennys.com'),
      ('IHOP', 'ihop.com'),
      ('Bob Evans', 'bobevans.com'),
      ('Texas Roadhouse', 'texasroadhouse.com'),
      ('Bar Louie', 'barlouie.com'),
      ('Benchmark Restaurant', 'benchmarkrestaurant.com'),
      -- Convenience
      ('7-Eleven', '7-eleven.com'),
      ('Circle K', 'circlek.com'),
      ('Speedway', 'speedway.com'),
      ('Sheetz', 'sheetz.com'),
      ('Wawa', 'wawa.com'),
      ('GetGo', 'getgo.com'),
      ('Rite Aid', 'riteaid.com'),
      ('CVS', 'cvs.com'),
      ('Walgreen''s', 'walgreens.com'),
      ('Walgreens', 'walgreens.com'),
      -- Beauty
      ('Sephora', 'sephora.com'),
      ('Ulta Beauty', 'ulta.com'),
      ('Ulta', 'ulta.com'),
      ('MAC Cosmetics', 'maccosmetics.com'),
      ('Lush', 'lush.com'),
      ('Bath & Body Works', 'bathandbodyworks.com'),
      ('The Body Shop', 'thebodyshop.com'),
      ('Kiehl''s', 'kiehls.com'),
      ('L''Occitane', 'loccitane.com'),
      ('Origins', 'origins.com'),
      ('BareMinerals', 'bareminerals.com'),
      -- Pet
      ('PetSmart', 'petsmart.com'),
      ('Petco', 'petco.com'),
      ('Pet Supplies Plus', 'petsuppliesplus.com'),
      ('Chuck & Don''s', 'chuckanddons.com'),
      ('Hollywood Feed', 'hollywoodfeed.com'),
      ('Mud Bay', 'mudbay.com'),
      ('Unleashed by Petco', 'petco.com'),
      ('Pet Valu', 'petvalu.com'),
      ('Pet Supermarket', 'petsupermarket.com'),
      ('Pet Food Express', 'petfoodexpress.com'),
      -- Retail
      ('Foot Locker', 'footlocker.com'),
      ('Finish Line', 'finishline.com'),
      ('Zumiez', 'zumiez.com'),
      ('H&M', 'hm.com'),
      ('American Eagle', 'ae.com'),
      ('Hot Topic', 'hottopic.com'),
      ('PacSun', 'pacsun.com'),
      ('Old Navy', 'oldnavy.com'),
      ('Ross', 'rossstores.com'),
      ('TJ Maxx', 'tjmaxx.com'),
      ('Marshalls', 'marshalls.com'),
      ('Kohl''s', 'kohls.com'),
      ('Target', 'target.com'),
      ('Walmart', 'walmart.com'),
      ('DSW', 'dsw.com'),
      ('Shoe Carnival', 'shoecarnival.com'),
      ('Rack Room Shoes', 'rackroomshoes.com'),
      -- Malls
      ('Franklin Park Mall', 'simon.com'),
      ('Westfield Franklin Park', 'westfield.com'),
      ('Levis Commons', 'shoplevisscommons.com'),
      ('The Shops at Fallen Timbers', 'shopfallentimbers.com'),
      -- Toledo locals
      ('Balance Grille', 'balancegrille.com'),
      ('Home Slice Pizza', 'homeslicepizza.com'),
      ('Tony Packo''s', 'tonypackos.com'),
      ('Mancy''s Steakhouse', 'mancys.com'),
      ('Doc Watson''s', 'docwatsons.com'),
      ('Ye Olde Durty Bird', 'yeoldedurtybird.com'),
      ('Ye Olde Dirty Bird', 'yeoldedurtybird.com'),
      ('Fowl & Fodder', 'fowlandfodder.com'),
      ('Flap Flap''s', 'flapflaps.com')
  ),
  urls AS (
    SELECT name, 'https://cdn.brandfetch.io/' || domain || '/logo' AS logo
    FROM domains
  ),
  master_upd AS (
    UPDATE public.restaurants_master m
    SET
      logo_url = u.logo,
      image_url = CASE
        WHEN m.image_url IS NULL
          OR btrim(m.image_url) = ''
          OR m.image_url ILIKE '%images.unsplash.com%'
          OR (p_overwrite_brandfetch AND m.image_url LIKE 'https://cdn.brandfetch.io/%')
        THEN u.logo
        ELSE m.image_url
      END
    FROM urls u
    WHERE m.name = u.name
      AND (
        m.logo_url IS NULL
        OR btrim(m.logo_url) = ''
        OR (
          p_overwrite_brandfetch
          AND m.logo_url LIKE 'https://cdn.brandfetch.io/%'
          AND m.logo_url IS DISTINCT FROM u.logo
        )
      )
      AND (
        m.logo_url IS NULL
        OR (
          m.logo_url NOT ILIKE '%seed%20logos%'
          AND m.logo_url NOT ILIKE '%seed logos%'
        )
      )
    RETURNING m.id
  )
  SELECT count(*)::int INTO v_master_updated FROM master_upd;

  WITH domains(name, domain) AS (
    SELECT * FROM (
      VALUES
        ('McDonald''s', 'mcdonalds.com'),
        ('Wendy''s', 'wendys.com'),
        ('Burger King', 'burgerking.com'),
        ('Taco Bell', 'tacobell.com'),
        ('KFC', 'kfc.com'),
        ('Subway', 'subway.com'),
        ('Chipotle', 'chipotle.com'),
        ('Starbucks', 'starbucks.com'),
        ('Target', 'target.com'),
        ('Walmart', 'walmart.com')
    ) AS t(name, domain)
  ),
  urls AS (
    SELECT name, 'https://cdn.brandfetch.io/' || domain || '/logo' AS logo
    FROM domains
  ),
  rest_upd AS (
    UPDATE public.restaurants r
    SET
      logo_url = u.logo,
      image_url = CASE
        WHEN r.image_url IS NULL
          OR btrim(r.image_url) = ''
          OR r.image_url ILIKE '%images.unsplash.com%'
        THEN u.logo
        ELSE r.image_url
      END
    FROM urls u
    WHERE r.name = u.name
      AND (
        r.logo_url IS NULL
        OR btrim(r.logo_url) = ''
        OR (
          p_overwrite_brandfetch
          AND r.logo_url LIKE 'https://cdn.brandfetch.io/%'
          AND r.logo_url IS DISTINCT FROM u.logo
        )
      )
      AND (
        r.logo_url IS NULL
        OR (
          r.logo_url NOT ILIKE '%seed%20logos%'
          AND r.logo_url NOT ILIKE '%seed logos%'
        )
      )
    RETURNING r.id
  )
  SELECT count(*)::int INTO v_restaurants_updated FROM rest_upd;

  RETURN jsonb_build_object(
    'ok', true,
    'restaurants_master_updated', v_master_updated,
    'restaurants_updated', v_restaurants_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_seeded_merchant_logos(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_seeded_merchant_logos(boolean) TO authenticated;

COMMENT ON FUNCTION public.backfill_seeded_merchant_logos(boolean) IS
  'Admin: set logo_url on seeded marketplace merchants from curated Brandfetch domains; preserves seed-storage uploads.';

-- One-shot apply for environments that run migrations as a privileged role
-- (service / postgres). Safe for re-run via admin RPC afterward.
DO $$
DECLARE
  r record;
  v_logo text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('McDonald''s', 'mcdonalds.com'),
      ('McDonalds', 'mcdonalds.com'),
      ('Wendy''s', 'wendys.com'),
      ('Burger King', 'burgerking.com'),
      ('Taco Bell', 'tacobell.com'),
      ('KFC', 'kfc.com'),
      ('Subway', 'subway.com'),
      ('Chipotle', 'chipotle.com'),
      ('Five Guys', 'fiveguys.com'),
      ('Popeyes', 'popeyes.com'),
      ('Chick-fil-A', 'chick-fil-a.com'),
      ('Panera Bread', 'panerabread.com'),
      ('Jimmy John''s', 'jimmyjohns.com'),
      ('Little Caesars', 'littlecaesars.com'),
      ('Pizza Hut', 'pizzahut.com'),
      ('Domino''s', 'dominos.com'),
      ('Wingstop', 'wingstop.com'),
      ('Raising Cane''s', 'raisingcanes.com'),
      ('Qdoba', 'qdoba.com'),
      ('Firehouse Subs', 'firehousesubs.com'),
      ('Jersey Mike''s', 'jerseymikes.com'),
      ('Buffalo Wild Wings', 'buffalowildwings.com'),
      ('White Castle', 'whitecastle.com'),
      ('Steak ''n Shake', 'steaknshake.com'),
      ('Marco''s Pizza', 'marcos.com'),
      ('Papa John''s', 'papajohns.com'),
      ('Sonic', 'sonicdrivein.com'),
      ('Starbucks', 'starbucks.com'),
      ('Dunkin''', 'dunkindonuts.com'),
      ('Panda Express', 'pandaexpress.com'),
      ('Applebee''s', 'applebees.com'),
      ('Chili''s', 'chilis.com'),
      ('Olive Garden', 'olivegarden.com'),
      ('Outback Steakhouse', 'outback.com'),
      ('Red Lobster', 'redlobster.com'),
      ('Red Robin', 'redrobin.com'),
      ('Cracker Barrel', 'crackerbarrel.com'),
      ('Denny''s', 'dennys.com'),
      ('IHOP', 'ihop.com'),
      ('Bob Evans', 'bobevans.com'),
      ('Texas Roadhouse', 'texasroadhouse.com'),
      ('Bar Louie', 'barlouie.com'),
      ('7-Eleven', '7-eleven.com'),
      ('Circle K', 'circlek.com'),
      ('Speedway', 'speedway.com'),
      ('Sheetz', 'sheetz.com'),
      ('Wawa', 'wawa.com'),
      ('GetGo', 'getgo.com'),
      ('Rite Aid', 'riteaid.com'),
      ('CVS', 'cvs.com'),
      ('Walgreen''s', 'walgreens.com'),
      ('Sephora', 'sephora.com'),
      ('Ulta Beauty', 'ulta.com'),
      ('MAC Cosmetics', 'maccosmetics.com'),
      ('Lush', 'lush.com'),
      ('Bath & Body Works', 'bathandbodyworks.com'),
      ('The Body Shop', 'thebodyshop.com'),
      ('Kiehl''s', 'kiehls.com'),
      ('L''Occitane', 'loccitane.com'),
      ('Origins', 'origins.com'),
      ('BareMinerals', 'bareminerals.com'),
      ('PetSmart', 'petsmart.com'),
      ('Petco', 'petco.com'),
      ('Pet Supplies Plus', 'petsuppliesplus.com'),
      ('Chuck & Don''s', 'chuckanddons.com'),
      ('Hollywood Feed', 'hollywoodfeed.com'),
      ('Mud Bay', 'mudbay.com'),
      ('Foot Locker', 'footlocker.com'),
      ('Finish Line', 'finishline.com'),
      ('Zumiez', 'zumiez.com'),
      ('H&M', 'hm.com'),
      ('American Eagle', 'ae.com'),
      ('Hot Topic', 'hottopic.com'),
      ('PacSun', 'pacsun.com'),
      ('Old Navy', 'oldnavy.com'),
      ('Ross', 'rossstores.com'),
      ('TJ Maxx', 'tjmaxx.com'),
      ('Marshalls', 'marshalls.com'),
      ('Kohl''s', 'kohls.com'),
      ('Target', 'target.com'),
      ('Walmart', 'walmart.com'),
      ('DSW', 'dsw.com'),
      ('Shoe Carnival', 'shoecarnival.com'),
      ('Rack Room Shoes', 'rackroomshoes.com'),
      ('Franklin Park Mall', 'simon.com'),
      ('Westfield Franklin Park', 'westfield.com'),
      ('Levis Commons', 'shoplevisscommons.com'),
      ('The Shops at Fallen Timbers', 'shopfallentimbers.com'),
      ('Balance Grille', 'balancegrille.com'),
      ('Home Slice Pizza', 'homeslicepizza.com'),
      ('Tony Packo''s', 'tonypackos.com'),
      ('Mancy''s Steakhouse', 'mancys.com'),
      ('Doc Watson''s', 'docwatsons.com'),
      ('Ye Olde Durty Bird', 'yeoldedurtybird.com'),
      ('Fowl & Fodder', 'fowlandfodder.com'),
      ('Flap Flap''s', 'flapflaps.com')
    ) AS t(name, domain)
  LOOP
    v_logo := 'https://cdn.brandfetch.io/' || r.domain || '/logo';
    UPDATE public.restaurants_master m
    SET
      logo_url = v_logo,
      image_url = CASE
        WHEN m.image_url IS NULL OR btrim(m.image_url) = '' OR m.image_url ILIKE '%images.unsplash.com%'
          OR m.image_url LIKE 'https://cdn.brandfetch.io/%'
        THEN v_logo
        ELSE m.image_url
      END
    WHERE m.name = r.name
      AND (
        m.logo_url IS NULL
        OR btrim(m.logo_url) = ''
        OR (
          m.logo_url LIKE 'https://cdn.brandfetch.io/%'
          AND m.logo_url IS DISTINCT FROM v_logo
        )
      )
      AND (
        m.logo_url IS NULL
        OR (
          m.logo_url NOT ILIKE '%seed%20logos%'
          AND m.logo_url NOT ILIKE '%seed logos%'
        )
      );
  END LOOP;
END $$;
