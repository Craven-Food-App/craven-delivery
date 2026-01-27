# Apply Equity Adjustments for Torrance and Justin

## Summary

**Equity Reductions:**
- **Torrance Stroman**: 18,000,000 → 10,500,000 shares (-7,500,000)
- **Justin Sweet**: 5,000,000 → 4,200,000 shares (-800,000)
- **Total returned to equity pool**: 8,300,000 shares

With the cap table now at 70M shares, the new percentages are:
- Torrance: 15% (10.5M / 70M)
- Justin: 6% (4.2M / 70M)

## Apply the Migration

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Run the migration file: `supabase/migrations/20260127000002_adjust_torrance_justin_equity.sql`
3. Review the verification queries at the bottom

**Option 2: Via Supabase CLI**

```bash
supabase db push
```

## What the Migration Does

1. **Updates Torrance's equity** in `employee_equity` table:
   - Sets shares to 10,500,000
   - Recalculates percentage based on 70M total

2. **Updates Justin's equity** in `equity_ledger` and `vesting_schedules`:
   - Sets shares to 4,200,000
   - Updates vesting schedule
   - Maintains immediate vesting

3. **Updates `cap_tables`**:
   - Sets `founder_shares` to 10,500,000
   - Returns 8,300,000 shares to equity pool
   - Recalculates all percentages
   - Updates `total_issued` and `total_unissued`

4. **Logs all changes** in `governance_logs` for audit trail

## Verification Queries

After running the migration, verify the changes:

```sql
-- Check Torrance's equity
SELECT 
  shareholder_name,
  shares_total,
  shares_percentage
FROM employee_equity
WHERE shareholder_name ILIKE '%Torrance%';

-- Check Justin's equity
SELECT 
  recipient_user_id,
  shares_amount,
  notes,
  transaction_date
FROM equity_ledger
WHERE recipient_user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'jsweet.cfo@cravenusa.com'
)
AND transaction_type = 'grant';

-- Check cap table
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares,
  founder_shares,
  equity_pool,
  trust_percentage,
  founder_percentage,
  pool_percentage
FROM cap_tables;
```

## Expected Results

**Cap Table:**
- Total Authorized: 70,000,000
- Trust Shares: 55,000,000 (78.57%)
- Founder Shares: 10,500,000 (15%)
- Equity Pool: Increased by 8,300,000 shares

## Next Steps

After applying this migration:
1. Apply the 70M cap table update: `APPLY_CAP_TABLE_UPDATE_70M.md`
2. Test the allocate page to verify tiered equity structure
3. Review governance dashboard for updated equity distribution

