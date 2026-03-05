-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor. Keeps one row per (name, city).
-- Repoints restaurant_notify_me to the kept row before deleting duplicates.
-- =============================================================================

-- Point notify_me rows at the kept restaurant_master id (one per name+city)
WITH kept AS (
  SELECT DISTINCT ON (name, city) id AS kept_id, name, city
  FROM public.restaurants_master
  ORDER BY name, city, created_at
)
UPDATE public.restaurant_notify_me n
SET restaurant_master_id = k.kept_id
FROM public.restaurants_master r
JOIN kept k ON k.name = r.name AND k.city = r.city AND k.kept_id != r.id
WHERE n.restaurant_master_id = r.id;

-- Remove duplicates (keep earliest created per name+city)
DELETE FROM public.restaurants_master
WHERE id NOT IN (
  SELECT DISTINCT ON (name, city) id
  FROM public.restaurants_master
  ORDER BY name, city, created_at
);
