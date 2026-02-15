

# Feeder Earnings Tab -- Ledger-Based Backend Overhaul

## Summary

This plan introduces a proper ledger-based wallet system to replace the current ad-hoc earnings calculations, ensuring all UI values reconcile correctly without any visual changes.

---

## Phase 1: Database Schema (Migration)

### New Tables

**`feeder_wallets`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| feeder_id | uuid NOT NULL | references auth.users conceptually (no FK to auth) |
| currency | text DEFAULT 'USD' | |
| created_at | timestamptz DEFAULT now() | |

**`feeder_wallet_ledger_entries`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| wallet_id | uuid FK feeder_wallets | |
| feeder_id | uuid NOT NULL | denormalized for fast queries |
| occurred_at | timestamptz NOT NULL | when the earning/event happened (used for timeframe filtering) |
| type | text NOT NULL | enum-like: `earnings_base_pay`, `earnings_distance_pay`, `earnings_tip`, `earnings_bonus`, `earnings_adjustment_credit`, `earnings_adjustment_debit`, `payout_debit`, `payout_fee_debit`, `gas_credit`, `gas_transfer_debit` |
| direction | text NOT NULL | `credit` or `debit` |
| amount_cents | integer NOT NULL | always positive |
| status | text NOT NULL DEFAULT 'pending' | `pending`, `available`, `processing`, `paid`, `failed`, `reversed` |
| source_type | text NOT NULL | `order`, `payout`, `admin`, `system` |
| source_id | text | order ID, payout ID, etc. |
| memo | text | nullable |
| idempotency_key | text UNIQUE | prevents duplicate entries |
| created_at | timestamptz DEFAULT now() | |

RLS policies on both tables: feeder can only read their own rows (`feeder_id = auth.uid()`). Service role for writes.

### Migration of Existing Data

A one-time migration query will seed `feeder_wallets` and `feeder_wallet_ledger_entries` from existing `driver_earnings` and `driver_payouts` records, mapping:
- `driver_earnings.amount_cents` -> `earnings_base_pay` (status = 'available')
- `driver_earnings.tip_cents` -> `earnings_tip` (status = 'available')
- `driver_payouts` with status 'paid'/'completed'/'sent' -> `payout_debit` (status = 'paid')
- `driver_gas_money.balance` -> `gas_credit` entries

---

## Phase 2: Edge Function -- `get-feeder-earnings`

New edge function that computes the full earnings payload for a given timeframe.

**Endpoint**: `POST /get-feeder-earnings`
**Input**: `{ timeframe: "today" | "this_week" | "last_week" | "overall" }`
**Auth**: Bearer token required

### Logic

1. **Timeframe bounds**: Single function returns `[start, end]` or `[null, null]` for overall
2. **Earnings breakdown** (from ledger entries within timeframe):
   - `base_pay` = SUM where type = `earnings_base_pay`
   - `distance_pay` = SUM where type = `earnings_distance_pay`
   - `tips` = SUM where type = `earnings_tip`
   - `bonuses` = SUM where type = `earnings_bonus`
   - `adjustments` = SUM(`earnings_adjustment_credit`) - SUM(`earnings_adjustment_debit`)
   - `total_earned` = sum of all above
3. **Payout status** (from ledger entries within timeframe):
   - `available_for_payout` = SUM of earnings entries where status = 'available'
   - `pending` = SUM of earnings entries where status = 'pending'
   - `paid` = SUM of `payout_debit` entries where status = 'paid'
4. **Available balance** (top card) = `available_for_payout` (same value, guaranteed match)
5. **Sent to feeder card** = `paid` (same as payout status paid)
6. **Gas money** = SUM(`gas_credit` status='available') - SUM(`gas_transfer_debit` status in ['processing','paid'])
7. **Earnings metrics**:
   - `total_trips` = COUNT of distinct `source_id` where source_type = 'order' and type starts with `earnings_`
   - `active_time_hours` = from `driver_profiles.total_active_hours` or session data if available; null otherwise
   - `total_miles` = from order distance data if available; null otherwise
   - `earnings_per_hour` = total_earned / active_time if active_time > 0, else null
   - `earnings_per_mile` = total_earned / total_miles if total_miles > 0, else null
8. **Cashout eligibility** (always computed from overall/all-time data, not timeframe):
   - `completed_deliveries` from `driver_profiles.completed_orders` or count from ledger
   - `rating` from `driver_profiles.rolling_rating` (null if < 20 rated deliveries)
   - `on_time_rate` from `driver_profiles.on_time_rate` (null if < 10 tracked)
   - `accuracy` from `driver_profiles.completion_rate` (null if < 10 tracked)
   - `instant_cashout_unlocked` = all thresholds met (null values treated as "in progress", not failing)

**Response shape**:
```json
{
  "available_balance_cents": 12500,
  "total_earned_cents": 45000,
  "breakdown": {
    "base_pay_cents": 20000,
    "distance_pay_cents": 10000,
    "tips_cents": 10000,
    "bonuses_cents": 5000,
    "adjustments_cents": 0
  },
  "payout_status": {
    "available_cents": 12500,
    "pending_cents": 7500,
    "paid_cents": 25000
  },
  "sent_to_feeder_card_cents": 25000,
  "gas_money_cents": 5000,
  "metrics": {
    "total_trips": 75,
    "active_time_hours": 38.5,
    "total_miles": null,
    "earnings_per_hour_cents": null,
    "earnings_per_mile_cents": null
  },
  "cashout_eligibility": {
    "unlocked": false,
    "deliveries": 75,
    "deliveries_required": 50,
    "rating": 4.7,
    "rating_required": 4.5,
    "on_time_rate": 96.0,
    "on_time_required": 95.0,
    "accuracy": 100.0,
    "accuracy_required": 100.0
  }
}
```

---

## Phase 3: Frontend Changes (Data Layer Only, No UI Changes)

### `EarningsDashboard.tsx` -- `fetchEarningsData` refactor

Replace the current multi-query approach with a single call to `get-feeder-earnings`:

```typescript
const { data } = await supabase.functions.invoke('get-feeder-earnings', {
  body: { timeframe: timeRange === 'thisWeek' ? 'this_week' : timeRange === 'lastWeek' ? 'last_week' : timeRange }
});
```

Then map response fields directly to existing state variables:
- `setTotalEarnings(data.total_earned_cents / 100)`
- `setBreakdown(...)` from `data.breakdown`
- `setPayoutStatus({ available: data.payout_status.available_cents / 100, ... })`
- `setSentToFeederCard(data.sent_to_feeder_card_cents / 100)`
- `setGasMoney(data.gas_money_cents / 100)`
- Metrics: if `data.metrics.earnings_per_hour_cents` is null, set to null (UI shows "--")
- Cashout eligibility: map from `data.cashout_eligibility`, using null for "in progress" metrics

### Null handling for metrics

Update `EarningsMetrics` interface to allow nulls:
```typescript
interface EarningsMetrics {
  earningsPerHour: number | null;
  earningsPerMile: number | null;
  activeTime: number | null;
  totalTrips: number;
}
```

In the existing UI rendering, when a metric is null, display "--" instead of "$0.00":
```typescript
// Only change the data formatting, not the layout
metrics.earningsPerHour !== null ? formatCurrency(metrics.earningsPerHour) : '--'
```

### Cashout eligibility null handling

When rating/on_time/accuracy is null (insufficient data), show "--" in the checklist value and treat as "in progress" (not failing). The Lock/Check icon logic stays the same; only the value text changes.

---

## Phase 4: Cashout Endpoint Hardening

### `create-instant-payout` updates

- Add idempotency key check (hash of `driver_id + amount + timestamp_minute`)
- Verify `instant_cashout_unlocked` server-side before processing
- Validate `amount <= available_for_payout` from ledger (not from Stripe balance alone)
- On success: create `payout_debit` ledger entry with status = 'processing'
- Stripe webhook updates status to 'paid' or 'failed'
- On failure: create reversal entry or mark as 'failed'

### `transfer-earnings` updates

- Validate against ledger `available_for_payout` instead of ad-hoc calculation
- Create `payout_debit` ledger entry
- No idempotency key collision with instant payouts (different source_type)

---

## Phase 5: Pending-to-Available Scheduler (Future/Optional)

A Supabase cron job (pg_cron or edge function on schedule) that:
- Moves `earnings_base_pay` and `earnings_distance_pay` from `pending` to `available` after delivery completion
- Moves `earnings_tip` from `pending` to `available` after tip edit window (configurable, e.g., 2 hours)
- Moves `earnings_bonus` to `available` immediately

For now, new earnings entries will be created with status = 'available' since the current `driver_earnings` table doesn't distinguish pending/available. The scheduler infrastructure will be in place for when the ordering system starts writing pending entries.

---

## Reconciliation Guarantees

These invariants are enforced by the ledger model:

1. **Available Balance = Payout Status Available for Payout** -- same query, same number
2. **Total Earned = Available + Pending + Paid** -- all derived from the same ledger entries
3. **No fake zeros** -- null metrics show "--"
4. **Lock only gates action** -- eligibility check is separate from balance computation

---

## Technical Notes

- The `feeder_wallet_ledger_entries` table uses an `idempotency_key` column to prevent duplicate entries from retries
- All amounts stored in cents (integer) to avoid floating-point issues
- Existing `driver_earnings` and `driver_payouts` tables remain untouched; the ledger is a parallel system that will eventually replace them
- The `get-feeder-earnings` edge function uses `SUPABASE_SERVICE_ROLE_KEY` for reading ledger data, with auth verification via the Bearer token
- RLS on `feeder_wallet_ledger_entries` allows feeders to SELECT their own rows only

