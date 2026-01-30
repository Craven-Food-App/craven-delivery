# Apply Cap Table Update to 70M Shares

## What Changed

- Updated cap table from 100M to 70M authorized shares
- Implemented tiered equity structure for foundational invites
- Updated Edge Functions to use 70M default

## Apply the Migration

Run this in Supabase SQL Editor:

```sql
-- Update cap table to 70,000,000 authorized shares
UPDATE cap_tables
SET 
  total_authorized = 70000000,
  total_unissued = 70000000 - COALESCE(total_issued, 0),
  updated_at = NOW()
WHERE id = (SELECT id FROM cap_tables LIMIT 1);

-- Verify the update
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  (total_authorized - total_issued) as calculated_unissued
FROM cap_tables
LIMIT 1;
```

Expected result:
- `total_authorized`: 70,000,000
- Unissued shares will be recalculated based on current issued shares

## Tiered Equity Structure

The allocate page now shows:

| Contribution | Equity | Shares | Tier |
|-------------|--------|--------|------|
| $50 - $99 | 0.2% | 140,000 | Supporter Tier |
| $100 - $249 | 0.6% | 420,000 | Partner Tier |
| $250 - $499 | 0.8% | 560,000 | Executive Tier |
| $500+ | 1.0% | 700,000 | Founder's Circle |

## Edge Functions Updated

The following Edge Functions now default to 70M shares:
- `governance-grant-equity`
- `governance-fix-cap-table`

No redeployment needed - these read from the database.

## Testing

After applying the migration, test the allocate page at `/access` → `/allocate` to see the new tiered breakdown.

