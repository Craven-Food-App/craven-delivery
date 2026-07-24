-- =============================================================================
-- Deduplicate seeded marketplace merchants.
-- Root cause: Toledo seed migrations re-INSERT the same names with new UUIDs;
-- Kids Menu seed reuses chain names; marketplace_chains overlaps master.
-- =============================================================================

-- 1) Normalize known near-duplicate spellings
UPDATE public.restaurants_master
SET name = CASE lower(trim(name))
  WHEN 'papa johns' THEN 'Papa John''s'
  WHEN 'mcdonalds' THEN 'McDonald''s'
  WHEN 'kengo sushi' THEN 'Kengo Sushi & Yakitori'
  WHEN 'westfield franklin park' THEN 'Franklin Park Mall'
  WHEN 'ye olde dirty bird' THEN 'Ye Olde Durty Bird'
  WHEN 'red robbin' THEN 'Red Robin'
  WHEN 'rosie''s' THEN 'Rosie''s Italian Grille'
  WHEN 'rosiies' THEN 'Rosie''s Italian Grille'
  ELSE name
END
WHERE lower(trim(name)) IN (
  'papa johns',
  'mcdonalds',
  'kengo sushi',
  'westfield franklin park',
  'ye olde dirty bird',
  'red robbin',
  'rosie''s',
  'rosiies'
);

-- 2) Repoint restaurant_notify_me to the kept master row (if table exists)
DO $$
BEGIN
  IF to_regclass('public.restaurant_notify_me') IS NOT NULL THEN
    UPDATE public.restaurant_notify_me n
    SET restaurant_master_id = kept.kept_id
    FROM (
      SELECT
        r.id AS dupe_id,
        (
          SELECT k.id
          FROM public.restaurants_master k
          WHERE lower(trim(k.name)) = lower(trim(r.name))
            AND lower(trim(COALESCE(k.city, ''))) = lower(trim(COALESCE(r.city, '')))
          ORDER BY
            CASE k.status
              WHEN 'ACTIVE' THEN 0
              WHEN 'REQUESTABLE' THEN 1
              WHEN 'LEAD_READY' THEN 1
              WHEN 'COMING_SOON' THEN 2
              ELSE 3
            END,
            CASE WHEN COALESCE(k.logo_url, k.image_url) IS NOT NULL THEN 0 ELSE 1 END,
            k.created_at ASC NULLS LAST,
            k.id ASC
          LIMIT 1
        ) AS kept_id
      FROM public.restaurants_master r
    ) kept
    WHERE n.restaurant_master_id = kept.dupe_id
      AND kept.kept_id IS NOT NULL
      AND kept.kept_id <> kept.dupe_id;
  END IF;
END $$;

-- 3) Keep one restaurants_master row per name + city
DELETE FROM public.restaurants_master r
WHERE r.id NOT IN (
  SELECT DISTINCT ON (lower(trim(name)), lower(trim(COALESCE(city, '')))) id
  FROM public.restaurants_master
  ORDER BY
    lower(trim(name)),
    lower(trim(COALESCE(city, ''))),
    CASE status
      WHEN 'ACTIVE' THEN 0
      WHEN 'REQUESTABLE' THEN 1
      WHEN 'LEAD_READY' THEN 1
      WHEN 'COMING_SOON' THEN 2
      ELSE 3
    END,
    CASE WHEN COALESCE(logo_url, image_url) IS NOT NULL THEN 0 ELSE 1 END,
    created_at ASC NULLS LAST,
    id ASC
);

-- 4) Remove national chain pins that already exist as master or live restaurants
DELETE FROM public.marketplace_chains c
WHERE EXISTS (
  SELECT 1
  FROM public.restaurants_master m
  WHERE lower(trim(m.name)) = lower(trim(c.name))
)
OR EXISTS (
  SELECT 1
  FROM public.restaurants r
  WHERE r.is_active = true
    AND lower(trim(r.name)) = lower(trim(c.name))
);

-- 5) Prevent future exact name+city duplicates
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_master_name_city_uidx
  ON public.restaurants_master (lower(trim(name)), lower(trim(COALESCE(city, ''))));

COMMENT ON INDEX public.restaurants_master_name_city_uidx IS
  'Prevents duplicate seeded merchants for the same name + city.';
