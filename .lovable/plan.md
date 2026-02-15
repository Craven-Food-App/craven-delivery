

# Fix Feeder Card Balance Persistence

## Problem

There are two disconnected wallet systems:
- **Old system** (`driver_wallet` + `wallet_ledger`): Written to by `finalize-delivery` after each delivery via `credit_wallet_from_earnings`
- **New ledger** (`feeder_wallet_ledger_entries`): Read by the Earnings Dashboard but never written to

The Feeder Card shows $0 on every reload because the new ledger table is always empty.

## Solution: Dual-Write on Delivery Completion

The proper fix is to make `finalize-delivery` also write to the new `feeder_wallet_ledger_entries` table after each delivery. This means the Feeder Card balance auto-updates after every completed delivery -- no session end required.

---

## How the Feeder Card Balance Will Work

1. **Delivery completed** --> `finalize-delivery` writes individual ledger entries (`earnings_base_pay`, `earnings_tip`, etc.) with status `available` into `feeder_wallet_ledger_entries`
2. **Feeder Card balance** = SUM of all `available` earnings entries minus SUM of all `payout_debit` (paid) entries. This is cumulative, all-time, and persistent.
3. **"Your Earnings" card** = timeframe-filtered total from the same ledger (today/week/etc.)
4. **Cash out to debit/bank** creates a `payout_debit` entry, reducing the available balance

```text
Delivery #1 completes --> +$12.50 base_pay (available)
                      --> +$3.00  tip (available)
Delivery #2 completes --> +$10.00 base_pay (available)
                      --> +$5.00  tip (available)

Feeder Card Balance = $30.50

Feeder cashes out $20 --> payout_debit $20 (paid)

Feeder Card Balance = $10.50  (persistent across reloads)
```

## Cash Out Options

- **Instant (Stripe)**: Requires eligibility (50+ deliveries, 4.5+ rating, etc.). Immediate transfer via Stripe.
- **Bank Transfer**: 3-day ACH transfer, available to all feeders. New option.
- **Auto Weekly**: Automatic weekly payout to bank account. New option (settings toggle).

---

## Changes

### 1. Update `finalize-delivery` Edge Function

Add ledger entry writes after the existing `driver_earnings` insert:
- Ensure/create `feeder_wallets` row for the driver (idempotent upsert)
- Insert `earnings_base_pay` entry with `status = 'available'`
- Insert `earnings_tip` entry (if tip > 0) with `status = 'available'`
- Use `idempotency_key` = `order_{orderId}_base_pay` / `order_{orderId}_tip` to prevent duplicates on retries

### 2. Update `get-feeder-earnings` Edge Function

Change the Feeder Card balance computation:
- **Feeder Card Balance** = SUM(all earnings entries where status = 'available') - SUM(payout_debit where status = 'paid') -- computed across ALL time regardless of timeframe filter
- This is returned as a new field `card_balance_cents` separate from `available_balance_cents` (which is timeframe-filtered)

### 3. Update `EarningsDashboard.tsx` (Data Only)

- Read `card_balance_cents` from the edge function response for the Feeder Card display instead of querying ledger directly in `fetchCardData`
- Remove the separate `fetchCardData` ledger query (redundant now)
- Add bank transfer option alongside instant cashout (simple UI text change in the existing modal, no layout changes)

### 4. Data Migration

Run a one-time backfill to populate `feeder_wallet_ledger_entries` from existing `driver_earnings` records so historical deliveries show up correctly:
- Each `driver_earnings` row becomes a `earnings_base_pay` entry (amount_cents) + `earnings_tip` entry (tip_cents)
- Each `driver_payouts` row with status paid/completed becomes a `payout_debit` entry

---

## Technical Details

### `finalize-delivery` new code (after existing `driver_earnings` insert):

```typescript
// Ensure feeder wallet exists
const { data: wallet } = await supabase
  .from('feeder_wallets')
  .upsert({ feeder_id: resolvedDriverId, currency: 'USD' }, 
    { onConflict: 'feeder_id' })
  .select('id')
  .single();

// Write ledger entries (idempotent via idempotency_key)
const ledgerEntries = [];
if (driverBeforeTipCents > 0) {
  ledgerEntries.push({
    wallet_id: wallet.id,
    feeder_id: resolvedDriverId,
    occurred_at: new Date().toISOString(),
    type: 'earnings_base_pay',
    direction: 'credit',
    amount_cents: driverBeforeTipCents,
    status: 'available',
    source_type: 'order',
    source_id: orderId,
    idempotency_key: `order_${orderId}_base_pay`,
  });
}
if (tip > 0) {
  ledgerEntries.push({
    wallet_id: wallet.id,
    feeder_id: resolvedDriverId,
    occurred_at: new Date().toISOString(),
    type: 'earnings_tip',
    direction: 'credit',
    amount_cents: tip,
    status: 'available',
    source_type: 'order',
    source_id: orderId,
    idempotency_key: `order_${orderId}_tip`,
  });
}
// Upsert to handle retries gracefully
for (const entry of ledgerEntries) {
  await supabase
    .from('feeder_wallet_ledger_entries')
    .upsert(entry, { onConflict: 'idempotency_key' });
}
```

### `get-feeder-earnings` new field:

```typescript
// Card balance = ALL-TIME available earnings - ALL-TIME paid payouts
// Separate query without timeframe filter
const { data: allTimeEntries } = await supabase
  .from('feeder_wallet_ledger_entries')
  .select('type, amount_cents, status')
  .eq('feeder_id', feederId)
  .in('status', ['available', 'paid']);

const totalAvailableEarnings = allTimeEntries
  .filter(e => e.type.startsWith('earnings_') && e.status === 'available')
  .reduce((s, e) => s + e.amount_cents, 0);
const totalPaidOut = allTimeEntries
  .filter(e => e.type === 'payout_debit' && e.status === 'paid')
  .reduce((s, e) => s + e.amount_cents, 0);

payload.card_balance_cents = Math.max(0, totalAvailableEarnings - totalPaidOut);
```

### Migration SQL:

```sql
-- Backfill ledger from existing driver_earnings
INSERT INTO feeder_wallet_ledger_entries (
  wallet_id, feeder_id, occurred_at, type, direction, 
  amount_cents, status, source_type, source_id, idempotency_key
)
SELECT 
  fw.id, de.driver_id, de.earned_at, 'earnings_base_pay', 'credit',
  de.amount_cents, 'available', 'order', de.order_id::text,
  'order_' || de.order_id || '_base_pay'
FROM driver_earnings de
JOIN feeder_wallets fw ON fw.feeder_id = de.driver_id
WHERE de.amount_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;

-- Tips
INSERT INTO feeder_wallet_ledger_entries (...)
SELECT ... 'earnings_tip' ... de.tip_cents ...
WHERE de.tip_cents > 0
ON CONFLICT (idempotency_key) DO NOTHING;
```

