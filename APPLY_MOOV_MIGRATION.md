# Apply Moov Account Tracking Migration

Since there's a migration history mismatch, you can apply the Moov migration directly via the Supabase Dashboard.

## Option 1: Supabase Dashboard SQL Editor (Easiest)

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/sql/new
2. Copy and paste the following SQL:

```sql
-- Add Moov account tracking to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS moov_account_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_invite_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_onboarding_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moov_capabilities jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moov_fee_plan_codes text[] DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.restaurants.moov_account_id IS 'Moov account ID after onboarding completion';
COMMENT ON COLUMN public.restaurants.moov_onboarding_invite_code IS 'Moov onboarding invite code for tracking';
COMMENT ON COLUMN public.restaurants.moov_onboarding_status IS 'Moov onboarding status: pending, completed, revoked, failed';
COMMENT ON COLUMN public.restaurants.moov_onboarding_complete IS 'Whether Moov onboarding is complete';
COMMENT ON COLUMN public.restaurants.moov_capabilities IS 'JSON array of enabled Moov capabilities';
COMMENT ON COLUMN public.restaurants.moov_fee_plan_codes IS 'Array of Moov fee plan codes assigned to this account';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_moov_account_id ON public.restaurants(moov_account_id) WHERE moov_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_moov_invite_code ON public.restaurants(moov_onboarding_invite_code) WHERE moov_onboarding_invite_code IS NOT NULL;
```

3. Click **Run** to execute the migration

## Option 2: Fix Migration History Then Push

If you want to fix the migration history first, run these commands:

```powershell
# Repair migration history (run the commands suggested by Supabase)
supabase migration repair --status reverted 20251123190154 20251124010519 20251126051225 20251126055918 20251126075116 20251126081631 20251126092729

# Then pull remote migrations to sync
supabase db pull

# Then push your new migration
supabase db push
```

## Verify Migration Applied

After applying the migration, verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name LIKE 'moov%';
```

You should see all 6 new columns listed.

