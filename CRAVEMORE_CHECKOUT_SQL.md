# CraveMore Checkout SQL Queries

SQL queries for managing and viewing CraveMore checkout sessions, payments, and membership activations.

## View Checkout Sessions & Payments

### View all Stripe checkout sessions (if stored)
```sql
-- Note: Stripe checkout sessions are typically stored in Stripe, not Supabase
-- But you can view memberships created from checkouts
SELECT 
  um.id,
  um.user_id,
  up.email,
  um.plan_key,
  um.status,
  um.started_at,
  um.provider_subscription_id,
  um.provider_customer_id,
  um.founding_member,
  um.created_at
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
WHERE um.provider = 'stripe'
ORDER BY um.created_at DESC;
```

### View recent membership activations
```sql
SELECT 
  um.id,
  um.user_id,
  up.email,
  up.full_name,
  um.plan_key,
  um.status,
  um.started_at,
  um.renews_at,
  um.provider_subscription_id,
  um.founding_member,
  CASE 
    WHEN um.plan_key = 'monthly' THEN 949
    WHEN um.plan_key = 'annual' THEN 8900
    WHEN um.plan_key = 'lifetime' THEN 29900
  END as price_paid_cents
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
WHERE um.status = 'active'
ORDER BY um.started_at DESC
LIMIT 50;
```

### View pending/processing checkouts
```sql
-- Memberships that were just created (within last hour) but might still be processing
SELECT 
  um.*,
  up.email,
  CASE 
    WHEN um.created_at > NOW() - INTERVAL '1 hour' THEN 'Recent - May be processing'
    ELSE 'Older'
  END as checkout_status
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
WHERE um.created_at > NOW() - INTERVAL '24 hours'
ORDER BY um.created_at DESC;
```

## Payment & Revenue Queries

### Calculate total revenue by plan
```sql
SELECT 
  plan_key,
  COUNT(*) as total_purchases,
  SUM(
    CASE 
      WHEN plan_key = 'monthly' THEN 949
      WHEN plan_key = 'annual' THEN 8900
      WHEN plan_key = 'lifetime' THEN 29900
      ELSE 0
    END
  ) as total_revenue_cents,
  ROUND(
    SUM(
      CASE 
        WHEN plan_key = 'monthly' THEN 949
        WHEN plan_key = 'annual' THEN 8900
        WHEN plan_key = 'lifetime' THEN 29900
        ELSE 0
      END
    ) / 100.0, 2
  ) as total_revenue_dollars
FROM public.user_memberships
WHERE status IN ('active', 'past_due')
GROUP BY plan_key
ORDER BY total_revenue_cents DESC;
```

### Revenue by date (daily)
```sql
SELECT 
  DATE(created_at) as purchase_date,
  plan_key,
  COUNT(*) as purchases,
  SUM(
    CASE 
      WHEN plan_key = 'monthly' THEN 949
      WHEN plan_key = 'annual' THEN 8900
      WHEN plan_key = 'lifetime' THEN 29900
      ELSE 0
    END
  ) as revenue_cents
FROM public.user_memberships
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), plan_key
ORDER BY purchase_date DESC, plan_key;
```

### Lifetime memberships sold
```sql
-- Get lifetime cap info from plans table
SELECT 
  lifetime_cap_total,
  lifetime_cap_used,
  (lifetime_cap_total - lifetime_cap_used) as remaining
FROM public.cravemore_plans
WHERE plan_key = 'lifetime';

-- Also check actual memberships
SELECT 
  COUNT(*) as actual_lifetime_members,
  COUNT(*) FILTER (WHERE founding_member = true) as founding_members
FROM public.user_memberships
WHERE plan_key = 'lifetime' AND status = 'active';

-- Combined view
SELECT 
  cp.lifetime_cap_total,
  cp.lifetime_cap_used,
  (cp.lifetime_cap_total - cp.lifetime_cap_used) as remaining,
  COUNT(um.id) as actual_memberships
FROM public.cravemore_plans cp
LEFT JOIN public.user_memberships um ON um.plan_key = 'lifetime' AND um.status = 'active'
WHERE cp.plan_key = 'lifetime'
GROUP BY cp.lifetime_cap_total, cp.lifetime_cap_used;
```

## Checkout Status & Issues

### View failed or canceled checkouts
```sql
SELECT 
  um.*,
  up.email,
  um.canceled_at,
  CASE 
    WHEN um.status = 'canceled' AND um.canceled_at < um.started_at + INTERVAL '1 day' 
      THEN 'Canceled quickly - possible checkout issue'
    WHEN um.status = 'past_due' 
      THEN 'Payment failed'
    ELSE 'Other'
  END as issue_type
FROM public.user_memberships um
LEFT JOIN public.user_profiles up ON up.user_id = um.user_id
WHERE um.status IN ('canceled', 'past_due', 'expired')
ORDER BY um.created_at DESC;
```

### Check for users who started checkout but never completed
```sql
-- This would require tracking checkout sessions separately
-- For now, check for users who might have issues:
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  um.id as membership_id,
  CASE 
    WHEN um.id IS NULL THEN 'No membership - checkout may have failed'
    ELSE 'Has membership'
  END as checkout_status
FROM auth.users u
LEFT JOIN public.user_memberships um ON um.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
  AND um.id IS NULL
ORDER BY u.created_at DESC;
```

## Stripe Integration Queries

### View Stripe customer IDs
```sql
SELECT 
  up.user_id,
  up.email,
  up.stripe_customer_id,
  um.provider_subscription_id,
  um.plan_key,
  um.status
FROM public.user_profiles up
LEFT JOIN public.user_memberships um ON um.user_id = up.user_id
WHERE up.stripe_customer_id IS NOT NULL
ORDER BY up.stripe_customer_id;
```

### Find users without Stripe customer ID
```sql
SELECT 
  u.id,
  u.email,
  um.plan_key,
  um.status
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.user_memberships um ON um.user_id = u.id
WHERE (up.stripe_customer_id IS NULL OR up.stripe_customer_id = '')
  AND um.id IS NOT NULL
ORDER BY u.created_at DESC;
```

## Checkout Testing Queries

### Create a test membership (simulate successful checkout)
```sql
-- Get a test user first
SELECT id, email FROM auth.users LIMIT 1;

-- Then create membership (replace USER_ID with actual UUID)
INSERT INTO public.user_memberships (
  user_id,
  plan_key,
  status,
  started_at,
  renews_at,
  provider,
  provider_customer_id,
  provider_subscription_id,
  founding_member
) VALUES (
  'USER_UUID_HERE'::uuid,  -- Replace with actual UUID
  'annual',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'stripe',
  'cus_test123',  -- Test Stripe customer ID
  'sub_test123',  -- Test subscription ID
  false
)
ON CONFLICT (user_id) DO UPDATE
SET 
  plan_key = EXCLUDED.plan_key,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  renews_at = EXCLUDED.renews_at;
```

### Simulate lifetime purchase
```sql
-- Create lifetime membership and increment cap
INSERT INTO public.user_memberships (
  user_id,
  plan_key,
  status,
  started_at,
  renews_at,
  provider,
  founding_member
) VALUES (
  'USER_UUID_HERE'::uuid,  -- Replace with actual UUID
  'lifetime',
  'active',
  NOW(),
  NULL,
  'stripe',
  true
)
ON CONFLICT (user_id) DO UPDATE
SET 
  plan_key = EXCLUDED.plan_key,
  status = EXCLUDED.status,
  founding_member = true;

-- Increment lifetime cap
UPDATE public.cravemore_plans
SET lifetime_cap_used = COALESCE(lifetime_cap_used, 0) + 1
WHERE plan_key = 'lifetime';
```

## Checkout Analytics

### Conversion funnel (if you track checkout starts)
```sql
-- Total active memberships
SELECT 
  COUNT(*) as total_active_memberships,
  COUNT(DISTINCT user_id) as unique_members
FROM public.user_memberships
WHERE status = 'active';
```

### Plan distribution
```sql
SELECT 
  plan_key,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.user_memberships
WHERE status = 'active'
GROUP BY plan_key
ORDER BY count DESC;
```

### Average time to first purchase (if tracking user creation)
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (um.started_at - u.created_at)) / 3600) as avg_hours_to_purchase,
  MIN(EXTRACT(EPOCH FROM (um.started_at - u.created_at)) / 3600) as min_hours,
  MAX(EXTRACT(EPOCH FROM (um.started_at - u.created_at)) / 3600) as max_hours
FROM public.user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.status = 'active';
```

## Troubleshooting Checkout Issues

### Check for orphaned memberships (no user)
```sql
SELECT 
  um.*
FROM public.user_memberships um
LEFT JOIN auth.users u ON u.id = um.user_id
WHERE u.id IS NULL;
```

### Check for duplicate memberships
```sql
SELECT 
  user_id,
  COUNT(*) as membership_count
FROM public.user_memberships
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### View membership entitlements status
```sql
SELECT 
  um.user_id,
  um.plan_key,
  um.status,
  me.zero_delivery_fee,
  me.priority_support,
  me.early_access,
  me.member_discounts,
  CASE 
    WHEN me.id IS NULL THEN 'Missing entitlements'
    ELSE 'OK'
  END as entitlement_status
FROM public.user_memberships um
LEFT JOIN public.membership_entitlements me ON me.user_id = um.user_id
WHERE um.status = 'active';
```

## Quick Checkout Status Check

### One-liner to check checkout health
```sql
SELECT 
  'Total Active Memberships' as metric,
  COUNT(*)::text as value
FROM public.user_memberships
WHERE status = 'active'
UNION ALL
SELECT 
  'Lifetime Remaining',
  (lifetime_cap_total - lifetime_cap_used)::text
FROM public.cravemore_plans
WHERE plan_key = 'lifetime'
UNION ALL
SELECT 
  'Recent Purchases (24h)',
  COUNT(*)::text
FROM public.user_memberships
WHERE created_at > NOW() - INTERVAL '24 hours';
```

