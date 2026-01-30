# Deploy Only Business Systems Migrations

## Quick Deploy - Just Our 5 New Migrations

Instead of deploying 130+ migrations, deploy **only** our business systems:

### Option 1: Manual SQL Execution (Safest)

Copy these 5 files and paste into **Supabase SQL Editor** one at a time:

1. `supabase/migrations/20250121000001_create_coo_cto_tables.sql`
2. `supabase/migrations/20250121000002_link_cfo_ceo_budgets.sql`
3. `supabase/migrations/20250121000003_create_procurement_system.sql`
4. `supabase/migrations/20250121000004_create_marketing_roi_system.sql`
5. `supabase/migrations/20250121000005_create_legal_compliance_system.sql`

### Option 2: Selective CLI Push

```bash
# Create temporary directory with just these 5 migrations
mkdir temp_deploy
copy supabase\migrations\20250121*_create_*.sql temp_deploy\
copy supabase\migrations\20250121*_link_*.sql temp_deploy\
copy supabase\migrations\20250121*_procurement_*.sql temp_deploy\

# Then use SQL editor to apply them
```

## After Migration Deployment

Then manually create COO/CTO users in Supabase Dashboard:

```sql
-- Insert COO and CTO into exec_users
INSERT INTO public.exec_users (user_id, role, access_level, title, department) VALUES
  ('<coo_user_id_from_auth_users>', 'coo', 9, 'Chief Operating Officer', 'Operations'),
  ('<cto_user_id_from_auth_users>', 'cto', 9, 'Chief Technology Officer', 'Technology');
```

## Why Manual?

- We have 130+ local migrations not on remote
- Manual deployment is safer for production
- You can review each SQL statement before execution
- No risk of unrelated migrations breaking production

