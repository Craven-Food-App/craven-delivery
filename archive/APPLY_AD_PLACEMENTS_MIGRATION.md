# Apply Ad Placements Migration

The Ad Placement Manager requires a database table to be created. **You must run the migration before the feature will work.**

## Migration File
`supabase/migrations/20260121000001_create_ad_placements.sql`

## How to Run the Migration

### Option 1: Using Supabase Dashboard SQL Editor (Easiest)

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/sql/new
2. Copy the entire contents of `supabase/migrations/20260121000001_create_ad_placements.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute the migration
5. You should see "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have Supabase CLI configured:

```bash
# Make sure you're in the project root
cd D:\Repositories\craven-delivery

# Run the migration
npx supabase db push
```

## What Gets Created

The migration creates:
- `ad_placements` table - Stores ad placement configurations
- Indexes for efficient querying
- Row Level Security (RLS) policies (uses existing `is_admin()` function)
- Automatic `updated_at` timestamp trigger

**Note:** The RLS policy uses the existing `is_admin()` and `is_craven_founder()` functions to avoid permission errors.

## Verify Migration Applied

After applying the migration, verify the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'ad_placements';
```

You should see `ad_placements` in the results.

## After Migration

Once the migration is complete:
1. The Ad Placement Manager in Marketing Portal will work
2. You can create ad placements for different pages
3. Ads will automatically appear on the Restaurants page based on your settings

## Access the Feature

1. Navigate to `/marketing-portal`
2. Expand the **Promotions** section
3. Click **Ad Placements**
4. Create your first ad placement!

