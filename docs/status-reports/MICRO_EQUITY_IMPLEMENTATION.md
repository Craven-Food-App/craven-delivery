# Micro-Equity Program Implementation

## Overview

Complete implementation of the Family & Friends Tier Program equity issuance system. All shares issued under this program are sourced exclusively from the `family_micro_equity_pool` (1.4M shares reserved).

## Core Requirements Met

✅ **Hard Constraint**: All `family_micro_equity` issuances MUST use `family_micro_equity_pool`  
✅ **Atomic Operations**: Pool decrement and issuance happen atomically  
✅ **Pool Exhaustion Protection**: Issuance fails if pool cannot cover shares  
✅ **Validation Rules**: Database-level constraints enforce all rules  
✅ **Traceability**: All issuances linked to pool via `equity_pool_id` and `equity_pool_code`  
✅ **Cap Table Integration**: Holdings automatically updated when equity issued

## Database Schema

### 1. `equity_pools` Table

Tracks reserved equity pools. The micro-equity pool is initialized with 1.4M shares.

```sql
- pool_code: 'family_micro_equity_pool' (unique)
- total_reserved_shares: 1,400,000
- remaining_reserved_shares: Starts at 1,400,000, decrements with each issuance
```

### 2. `contribution_orders` Table

Tracks each contribution payment from foundational invites.

```sql
- Links to invite_id
- Stores amount_cents, shares_promised, tier_name, equity_percentage
- payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
- Unique constraint: one paid order per invite
```

### 3. `equity_issuances` Table

Tracks all equity issuances with pool linkage.

```sql
- issuance_context: 'family_micro_equity' (for this program)
- equity_pool_id: FK to equity_pools.id
- equity_pool_code: 'family_micro_equity_pool' (denormalized)
- shares_issued: Number of shares issued
- strike_price_per_share: NULL (required for micro-equity)
- contribution_order_id: Links to contribution order
```

**Validation Constraints**:
- If `issuance_context = 'family_micro_equity'`:
  - `equity_pool_code` MUST equal `'family_micro_equity_pool'`
  - `equity_pool_id` MUST NOT be NULL
  - `strike_price_per_share` MUST be NULL

### 4. `cap_table_holdings` Table

Tracks individual shareholder holdings.

```sql
- holder_email: Primary identifier
- shares_total: Aggregated shares from all sources
- equity_source: 'family_micro_equity' (for this program)
- issuance_id: Links to equity_issuances
```

## Key Functions

### `issue_micro_equity_from_pool()`

**Purpose**: Atomically issues equity from micro-equity pool when contribution order is paid.

**Process**:
1. Locks pool row with `FOR UPDATE` (prevents concurrent modifications)
2. Validates pool has enough shares
3. Decrements `remaining_reserved_shares`
4. Creates `equity_issuances` record
5. Updates or creates `cap_table_holdings` record

**Returns**: JSONB with success status, issuance_id, and pool remaining shares.

**Error Handling**: Returns error JSONB if pool exhausted or other failure occurs.

### `calculate_foundational_tier()`

**Purpose**: Calculates equity tier, percentage, and shares based on contribution amount.

**Tier Mapping**:
- $500+: 1.0% (700,000 shares) - Founder's Circle
- $250-$499: 0.8% (560,000 shares) - Executive Tier
- $100-$249: 0.6% (420,000 shares) - Partner Tier
- $50-$99: 0.2% (140,000 shares) - Supporter Tier

**Returns**: JSONB with `tier_name`, `equity_percentage`, `shares`, `amount_dollars`.

### `verify_micro_equity_pool_integrity()`

**Purpose**: Verifies pool accounting integrity.

**Checks**: 
- Calculates total issued shares from pool
- Compares `remaining_reserved_shares` to expected value
- Returns `'OK'` or `'MISMATCH'` status

## Payment Flow

### 1. Checkout Creation

User selects amount on `/allocate` page → Creates Stripe Checkout session with `invite_id` in metadata.

### 2. Payment Completion (Webhook)

When Stripe sends `checkout.session.completed`:

1. **Get Invite**: Fetch invite details
2. **Calculate Tier**: Call `calculate_foundational_tier()` with amount
3. **Create Contribution Order**: Insert into `contribution_orders` with `payment_status='paid'`
4. **Issue Equity**: Call `issue_micro_equity_from_pool()` atomically
5. **Update Invite**: Mark invite as `status='paid'`

**Error Handling**:
- If equity issuance fails, contribution order marked as `payment_status='failed'`
- Invite still marked as paid (payment succeeded)
- Admin can manually review and fix failed issuances

## Validation & Safety

### Database-Level Constraints

1. **Pool Check Constraint**: `remaining_reserved_shares >= 0 AND <= total_reserved_shares`
2. **Micro-Equity Validation Trigger**: Enforces pool code and strike price rules
3. **Double Processing Prevention**: Prevents marking contribution order as paid twice
4. **Unique Constraint**: One paid contribution order per invite

### Triggers

1. **`validate_micro_equity_issuance`**: Validates micro-equity issuance rules on insert/update
2. **`prevent_double_contribution_processing`**: Prevents double processing of orders
3. **`sync_equity_pool_code`**: Auto-syncs pool code and ID fields

## Accounting Behavior

### Pool Management

- **Only mutable counter**: `equity_pools.remaining_reserved_shares`
- **NOT decremented separately**: Generic "unissued_shares" is not touched
- **Derived unissued**: `authorized - total_issued_outstanding`
- **Pool is subset**: Micro-equity pool is reserved subset of unissued shares

### Cap Table Updates

- Holdings aggregated by `holder_email` and `equity_source`
- Same person can have holdings from multiple sources (separate records)
- Shares automatically added to existing holding or new holding created

## UI/Reporting Requirements

Every micro-equity issuance and contributor holding must display:
- **Source**: "Micro-Equity Pool"
- **Pool Reference**: `pool_code = "family_micro_equity_pool"`

## Testing Checklist

- [ ] Payment webhook creates contribution order
- [ ] Equity issued atomically from pool
- [ ] Pool decremented correctly
- [ ] Cap table holdings updated
- [ ] Pool exhaustion blocks issuance
- [ ] Validation triggers prevent invalid issuances
- [ ] Double processing prevented
- [ ] Integrity verification function works

## Migration Files

1. `20260202000001_create_equity_pools_system.sql` - Core tables
2. `20260202000002_create_equity_issuance_function.sql` - Atomic issuance function
3. `20260202000003_create_tier_calculation_function.sql` - Tier calculation
4. `20260202000004_add_equity_validation_triggers.sql` - Validation triggers

## Next Steps

1. Run migrations in order
2. Verify pool initialized: `SELECT * FROM equity_pools WHERE pool_code = 'family_micro_equity_pool';`
3. Test payment flow with test Stripe webhook
4. Verify equity issuance: `SELECT * FROM equity_issuances WHERE issuance_context = 'family_micro_equity';`
5. Check cap table: `SELECT * FROM cap_table_holdings WHERE equity_source = 'family_micro_equity';`
6. Run integrity check: `SELECT * FROM verify_micro_equity_pool_integrity();`

## Done Criteria ✅

- ✅ Impossible to issue "family_micro_equity" shares unless micro-equity pool is decremented
- ✅ Pool exhaustion blocks issuance
- ✅ All program issuances traceable to micro-equity pool via `equity_pool_code`/`equity_pool_id`
- ✅ Database constraints enforce all rules
- ✅ Atomic operations prevent race conditions
- ✅ Error handling preserves payment state even if equity issuance fails

