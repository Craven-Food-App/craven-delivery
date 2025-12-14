SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cravemore_plans', 'cravemore_promos', 'user_memberships', 'membership_entitlements');


SELECT * FROM public.cravemore_plans ORDER BY is_most_popular DESC, plan_key;


SELECT * FROM public.cravemore_promos WHERE is_active = true;

INSERT INTO public.cravemore_plans (plan_key, display_name, billing_period, price_cents, is_active, is_most_popular, badge_text, lifetime_cap_total, lifetime_cap_used) VALUES
  ('monthly', 'Monthly', 'month', 949, true, false, NULL, NULL, NULL),
  ('annual', 'Annual', 'year', 8900, true, true, 'Most Popular', NULL, NULL),
  ('lifetime', 'Lifetime', 'one_time', 29900, true, false, 'Founding Member', 1000, 0)
ON CONFLICT (plan_key) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active,
  is_most_popular = EXCLUDED.is_most_popular,
  badge_text = EXCLUDED.badge_text;

UPDATE public.cravemore_plans 
SET price_cents = 949 
WHERE plan_key = 'monthly';

-- Update annual plan price
UPDATE public.cravemore_plans 
SET price_cents = 8900 
WHERE plan_key = 'annual';

-- Update lifetime plan price
UPDATE public.cravemore_plans 
SET price_cents = 29900 
WHERE plan_key = 'lifetime';


UPDATE public.cravemore_plans
SET promo_price_cents = CASE
  WHEN plan_key = 'monthly' THEN 899
  WHEN plan_key = 'annual' THEN 7900
  WHEN plan_key = 'lifetime' THEN 24900
  ELSE promo_price_cents
END;



SELECT 
  plan_key,
  lifetime_cap_total,
  lifetime_cap_used,
  (lifetime_cap_total - lifetime_cap_used) as remaining
FROM public.cravemore_plans
WHERE plan_key = 'lifetime';
-- Note: If you get a GROUP BY error, this query doesn't need GROUP BY - it's selecting from a single row

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


INSERT INTO public.cravemore_promos (promo_key, starts_at, ends_at, is_active)
VALUES (
  'custom_promo',
  '2025-02-01 00:00:00+00',
  '2025-02-28 23:59:59+00',
  true
);


UPDATE public.cravemore_promos
SET is_active = false
WHERE promo_key = 'launch_30_days';



SELECT 
  promo_key,
  starts_at,
  ends_at,
  is_active,
  CASE 
    WHEN NOW() BETWEEN starts_at AND ends_at THEN 'Active Now'
    WHEN NOW() < starts_at THEN 'Scheduled'
    ELSE 'Expired'
  END as status
FROM public.cravemore_promos
WHERE is_active = true
ORDER BY starts_at DESC;


SELECT 
  um.id,
  um.user_id,
  up.email,
  um.plan_key,
  um.status,
  um.started_at,
  um.renews_at,
  um.founding_member,
  um.created_at
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
ORDER BY um.created_at DESC;



SELECT 
  um.*,
  up.email,
  up.full_name
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
WHERE um.status = 'active'
  AND (um.renews_at IS NULL OR um.renews_at > NOW())
ORDER BY um.started_at DESC;



SELECT 
  plan_key,
  status,
  COUNT(*) as count
FROM public.user_memberships
GROUP BY plan_key, status
ORDER BY plan_key, status;



SELECT 
  um.user_id,
  um.plan_key,
  um.status,
  me.zero_delivery_fee,
  me.priority_support,
  me.early_access,
  me.member_discounts
FROM public.user_memberships um
LEFT JOIN public.membership_entitlements me ON me.user_id = um.user_id
WHERE um.status = 'active';



INSERT INTO public.user_memberships (
  user_id,
  plan_key,
  status,
  started_at,
  renews_at,
  provider,
  founding_member
) VALUES (
  'USER_ID_HERE',
  'annual',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'manual',
  false
)
ON CONFLICT (user_id) DO UPDATE
SET 
  plan_key = EXCLUDED.plan_key,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  renews_at = EXCLUDED.renews_at;


UPDATE public.user_memberships
SET 
  status = 'canceled',
  canceled_at = NOW()
WHERE user_id = 'USER_ID_HERE';



SELECT 
  id,
  name,
  cravemore_eligible
FROM public.merchants
WHERE cravemore_eligible = false;


UPDATE public.merchants
SET cravemore_eligible = true
WHERE cravemore_eligible IS NULL OR cravemore_eligible = false;


UPDATE public.merchants
SET cravemore_eligible = false
WHERE id = 'MERCHANT_ID_HERE';



SELECT 
  id,
  name,
  cravemore_eligible
FROM public.zones
WHERE cravemore_eligible = false;



SELECT 
  plan_key,
  COUNT(*) as subscriber_count,
  CASE 
    WHEN plan_key = 'monthly' THEN COUNT(*) * 949
    WHEN plan_key = 'annual' THEN COUNT(*) * 8900
    WHEN plan_key = 'lifetime' THEN COUNT(*) * 29900
  END as total_revenue_cents
FROM public.user_memberships
WHERE status = 'active'
GROUP BY plan_key;



SELECT 
  SUM(
    CASE 
      WHEN plan_key = 'monthly' THEN 949
      WHEN plan_key = 'annual' THEN 8900 / 12
      WHEN plan_key = 'lifetime' THEN 0
    END
  ) as mrr_cents
FROM public.user_memberships
WHERE status = 'active'
  AND (renews_at IS NULL OR renews_at > NOW());



SELECT 
  COUNT(*) FILTER (WHERE canceled_at >= NOW() - INTERVAL '30 days') as canceled_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  ROUND(
    (COUNT(*) FILTER (WHERE canceled_at >= NOW() - INTERVAL '30 days')::numeric / 
     NULLIF(COUNT(*) FILTER (WHERE status = 'active'), 0)) * 100,
    2
  ) as churn_rate_percent
FROM public.user_memberships;



SELECT 
  COUNT(*) as total_lifetime_members,
  COUNT(*) FILTER (WHERE founding_member = true) as founding_members
FROM public.user_memberships
WHERE plan_key = 'lifetime' AND status = 'active';




SELECT id, email FROM auth.users LIMIT 1;



INSERT INTO public.user_memberships (
  user_id,
  plan_key,
  status,
  started_at,
  renews_at,
  provider,
  founding_member
) VALUES (
  'USER_ID_FROM_ABOVE',
  'annual',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'test',
  false
);


UPDATE public.cravemore_plans
SET lifetime_cap_used = 0
WHERE plan_key = 'lifetime';


SELECT 
  has_active_cravemore('USER_ID_HERE') as has_membership;


SELECT 
  get_cravemore_price('annual') as price_cents;



DELETE FROM public.user_memberships
WHERE provider = 'test' OR provider = 'manual';


DELETE FROM public.user_memberships;
DELETE FROM public.membership_entitlements;



UPDATE public.cravemore_plans
SET lifetime_cap_used = 0
WHERE plan_key = 'lifetime';


