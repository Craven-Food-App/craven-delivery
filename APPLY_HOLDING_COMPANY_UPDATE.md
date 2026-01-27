# Apply Holding Company Update

## Summary

**Entity Rename & Equity Adjustment:**
- **Old**: "Invero Business Trust" (irrevocable trust) with 55,000,000 shares (78.57% of 70M)
- **New**: "Invero, Inc." (holding company entity) with 40,600,000 shares (58% of 70M)
- **Shares returned to pool**: 14,400,000 shares
- **Entity type**: Changed from "trust" to "entity"

## What This Accomplishes

1. Renames the majority shareholder from "Invero Business Trust" to "Invero, Inc."
2. Changes entity type from irrevocable trust to holding company
3. Reduces holding from 55M to 40.6M shares
4. Returns 14.4M shares to the equity pool
5. Updates all document templates to reflect the new entity name
6. Maintains majority shareholder status (58% > 50%)

## Apply the Migrations

**Run these migrations in order** via Supabase Dashboard → SQL Editor:

### 1. Rename Trust to Holding Company
```bash
# File: supabase/migrations/20260127000003_rename_trust_to_holding_company.sql
```

This migration:
- Updates `employee_equity` table (renames shareholder)
- Updates `cap_tables` (adjusts trust_shares to 40.6M)
- Updates `trusts` table (if exists)
- Returns 14.4M shares to equity pool
- Logs all changes

### 2. Update Document Templates
```bash
# File: supabase/migrations/20260127000004_update_document_templates_holding_company.sql
```

This migration:
- Updates all board document templates
- Changes placeholder names (founder_trust_name → holding_company_name)
- Updates Shareholders Agreement template
- Updates Founders Agreement template
- Updates Cap Table templates

## Via Supabase CLI

```bash
supabase db push
```

## Verification Queries

After running migrations:

```sql
-- Check Invero, Inc. equity
SELECT 
  shareholder_name,
  shares_total,
  shares_percentage,
  shareholder_type,
  is_majority_shareholder
FROM employee_equity
WHERE shareholder_name = 'Invero, Inc.';

-- Expected: 40,600,000 shares, 58%, type='entity', is_majority=true

-- Check cap table
SELECT 
  total_authorized,
  total_issued,
  total_unissued,
  trust_shares as holding_company_shares,
  founder_shares,
  equity_pool,
  trust_percentage as holding_company_percentage,
  founder_percentage,
  pool_percentage
FROM cap_tables;

-- Expected: trust_shares (now Invero, Inc.) = 40,600,000
-- Note: Column name "trust_shares" is historical, it represents Invero, Inc.

-- View all shareholders
SELECT 
  COALESCE(shareholder_name, e.first_name || ' ' || e.last_name) as name,
  eq.shares_total as shares,
  eq.shares_percentage as percentage,
  eq.shareholder_type
FROM employee_equity eq
LEFT JOIN employees e ON eq.employee_id = e.id
ORDER BY eq.shares_percentage DESC;
```

## Expected Cap Table (70M shares)

| Shareholder | Shares | Percentage | Type |
|------------|--------|------------|------|
| **Invero, Inc.** | 40,600,000 | 58.00% | Holding Company (Majority) |
| Torrance Stroman | 10,500,000 | 15.00% | Founder |
| Justin Sweet | 4,200,000 | 6.00% | Employee |
| Equity Pool | ~14,700,000+ | ~21%+ | Available |

**Important**: "Invero Business Trust (Irrevocable Trust)" is no longer used. The majority shareholder is **Invero, Inc.**, which is the holding company that owns Crave'n Inc.

**Note**: Equity pool increased by 14.4M from Trust reduction + 8.3M from Torrance/Justin adjustments = ~22.7M available for allocation

## Column Name Note

The `cap_tables.trust_shares` and `cap_tables.trust_percentage` columns retain their historical names for database compatibility, but now represent **Invero, Inc.** shares and percentage. Comments have been added to the schema for clarity.

**Invero, Inc.** is the holding company that:
- Owns Crave'n Inc.
- Is the majority shareholder (58% of 70M shares)
- Replaced the former "Invero Business Trust (Irrevocable Trust)"

## Document Templates Updated

All governance document templates now reference:
- `{{holding_company_name}}` with value "Invero, Inc."
- Replaced all instances of "Invero Business Trust (Irrevocable Trust)"
- Replaced placeholder `{{founder_trust_name}}` with `{{holding_company_name}}`
- Updated equity percentages to reflect new allocation

**Key Change**: The irrevocable trust structure is no longer used. Invero, Inc. is the holding company entity.

## Testing

1. Apply migrations
2. Check Governance Admin → Cap Table Overview
3. Generate new board documents to verify template updates
4. Review Shareholders Agreement and Founders Agreement

