-- Seed CraveMore default data
-- This migration inserts default plans and can be used to set up initial data

-- Ensure plans exist (upsert to avoid duplicates)
INSERT INTO public.cravemore_plans (plan_key, display_name, billing_period, price_cents, is_active, is_most_popular, badge_text, lifetime_cap_total, lifetime_cap_used) VALUES
  ('monthly', 'Monthly', 'month', 949, true, false, NULL, NULL, NULL),
  ('annual', 'Annual', 'year', 8900, true, true, 'Most Popular', NULL, NULL),
  ('lifetime', 'Lifetime', 'one_time', 29900, true, false, 'Founding Member', 1000, 0)
ON CONFLICT (plan_key) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  billing_period = EXCLUDED.billing_period,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active,
  is_most_popular = EXCLUDED.is_most_popular,
  badge_text = EXCLUDED.badge_text,
  lifetime_cap_total = EXCLUDED.lifetime_cap_total,
  lifetime_cap_used = COALESCE(EXCLUDED.lifetime_cap_used, cravemore_plans.lifetime_cap_used);

-- Optional: Create a launch promo (30 days from now)
-- Uncomment and adjust dates as needed
/*
INSERT INTO public.cravemore_promos (promo_key, starts_at, ends_at, is_active)
VALUES (
  'launch_30_days',
  NOW(),
  NOW() + INTERVAL '30 days',
  true
)
ON CONFLICT (promo_key) DO UPDATE
SET 
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  is_active = EXCLUDED.is_active;

-- Update plans with promo pricing
UPDATE public.cravemore_plans
SET promo_price_cents = CASE
  WHEN plan_key = 'monthly' THEN 899
  WHEN plan_key = 'annual' THEN 7900
  WHEN plan_key = 'lifetime' THEN 24900
  ELSE promo_price_cents
END
WHERE plan_key IN ('monthly', 'annual', 'lifetime');
*/

