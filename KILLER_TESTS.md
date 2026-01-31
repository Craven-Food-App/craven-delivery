# 🎯 The 4 Killer Tests (Production Money-Bug Detectors)

These tests find the bugs that cause double-pays, lost transfers, and broken ledgers.

---

## Test A: Duplicate Webhook Delivery

**What it tests**: Insert-first dedupe prevents concurrent/replay webhooks from double-executing transfers.

### Setup
```bash
# Install Stripe CLI if not already
stripe login

# Forward webhooks to local
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### Execute
```bash
# Trigger payment_intent.succeeded
stripe trigger payment_intent.succeeded

# IMMEDIATELY trigger again (simulates Stripe retry)
stripe trigger payment_intent.succeeded
```

### Expected Result
**First webhook**:
```
[Webhook] payment_intent.succeeded (evt_xxx)
[Payment Succeeded] Order: <order_id>
[Transfer] Restaurant: tr_xxx
[Transfer] Driver: tr_yyy
[Payment] Order <order_id> complete
```

**Second webhook** (same event ID):
```
[Webhook] payment_intent.succeeded (evt_xxx)
[Webhook] Duplicate event evt_xxx
```

**Verify in DB**:
```sql
SELECT event_id, status, processed_at
FROM stripe_events
WHERE type = 'payment_intent.succeeded'
ORDER BY received_at DESC
LIMIT 2;
```

Expected: ONE row (second insert failed with 23505, returned 200 duplicate)

**❌ FAIL CONDITION**: If you see TWO transfers created for same order, dedupe is broken.

---

## Test B: Crash Between Transfers (Partial Success)

**What it tests**: Transfer IDs stored immediately, retry only creates missing transfers.

### Setup
Manually simulate partial success state:

```sql
-- Find a completed order
SELECT id, stripe_transfer_restaurant_id, stripe_transfer_driver_id
FROM orders
WHERE payment_status = 'succeeded'
  AND transfers_status = 'complete'
LIMIT 1;

-- Simulate: restaurant transfer succeeded, driver failed
UPDATE orders
SET 
  stripe_transfer_driver_id = NULL,
  transfers_status = 'failed',
  transfers_error = 'Simulated crash',
  transfers_lease_id = NULL,
  transfers_lease_expires_at = NULL
WHERE id = '<order_id>';
```

### Execute
Use admin retry endpoint:

```bash
curl -X POST http://localhost:54321/functions/v1/admin-retry-transfers \
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "<order_id>"}'
```

### Expected Result
```
Lock acquired
Restaurant transfer: SKIP (already exists: tr_xxx)
Driver transfer: CREATE (tr_yyy)
Finalize: COMMIT
Ledger repair: UPSERT all entries
```

**Verify in DB**:
```sql
SELECT 
  stripe_transfer_restaurant_id,
  stripe_transfer_driver_id,
  transfers_status
FROM orders
WHERE id = '<order_id>';
```

Expected:
- `stripe_transfer_restaurant_id`: Original (unchanged)
- `stripe_transfer_driver_id`: NEW transfer ID
- `transfers_status`: `'complete'`

**Verify Stripe Dashboard**:
- Check Transfers → Verify only ONE transfer per role (no duplicates)

**❌ FAIL CONDITION**: If you see TWO restaurant transfers or TWO driver transfers in Stripe dashboard, idempotency is broken.

---

## Test C: Partial Refund Twice

**What it tests**: Each refund creates separate ledger entry (append-only), not cumulative.

### Setup
Create a test order and complete payment:

```bash
# Via your frontend or API
# Place order for $20.00 (2000 cents)
# Complete payment
```

### Execute
Issue two partial refunds:

```bash
# Get the charge ID from Stripe Dashboard or:
stripe charges list --limit 1

# First partial refund: $5.00
stripe refunds create \
  --charge ch_xxx \
  --amount 500

# Wait 5 seconds

# Second partial refund: $5.00 more
stripe refunds create \
  --charge ch_xxx \
  --amount 500
```

### Expected Result

**After first refund**:
```sql
SELECT 
  entry_type,
  amount_cents,
  stripe_object_id,
  memo
FROM ledger_entries
WHERE order_id = '<order_id>'
  AND entry_type = 'refund'
ORDER BY created_at;
```

Expected: ONE row
- `amount_cents`: -500
- `stripe_object_id`: `re_xxx1` (first refund ID)
- `memo`: "Partial refund (500/2000)"

**After second refund**:
```sql
-- Same query as above
```

Expected: TWO rows
1. `amount_cents`: -500, `stripe_object_id`: `re_xxx1`
2. `amount_cents`: -500, `stripe_object_id`: `re_xxx2` (DIFFERENT refund ID)

**Verify order status**:
```sql
SELECT payment_status FROM orders WHERE id = '<order_id>';
```

Expected: `'partial_refund'` (not fully refunded yet)

**❌ FAIL CONDITION**: 
- If second refund UPDATES first ledger entry (same `stripe_object_id`), append-only is broken
- If `payment_status = 'refunded'` after $10 refund on $20 order, logic is wrong

---

## Test D: Lease Lock (Concurrent Protection)

**What it tests**: Active lease prevents concurrent webhook from double-executing.

### Setup
Manually set active lease on an order:

```sql
-- Find order with completed transfers
SELECT id FROM orders 
WHERE payment_status = 'succeeded' 
  AND transfers_status = 'complete'
LIMIT 1;

-- Force back to partial with future lease
UPDATE orders
SET 
  transfers_status = 'partial',
  transfers_lease_id = gen_random_uuid()::text,
  transfers_lease_expires_at = now() + interval '5 minutes',
  stripe_transfer_restaurant_id = NULL,
  stripe_transfer_driver_id = NULL
WHERE id = '<order_id>';
```

### Execute
Trigger webhook or call retry:

```bash
# Via Stripe CLI (if you have test mode PI)
stripe trigger payment_intent.succeeded

# OR via admin retry
curl -X POST http://localhost:54321/functions/v1/admin-retry-transfers \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "<order_id>"}'
```

### Expected Result
```
[Lock] Order <order_id> status: locked
[Lock] Lease expires at: <future timestamp>
[Exit] No action taken
```

**Verify in DB**:
```sql
SELECT 
  transfers_status,
  transfers_lease_id,
  transfers_lease_expires_at,
  stripe_transfer_restaurant_id,
  stripe_transfer_driver_id
FROM orders
WHERE id = '<order_id>';
```

Expected:
- `transfers_status`: Still `'partial'`
- `transfers_lease_id`: Still set (unchanged)
- `transfers_lease_expires_at`: Still future
- Transfer IDs: Still NULL (no work performed)

**❌ FAIL CONDITION**: If transfers are created while lease is active, lock mechanism is broken.

### Cleanup
```sql
-- Clear lease to allow real processing
UPDATE orders
SET 
  transfers_lease_id = NULL,
  transfers_lease_expires_at = NULL
WHERE id = '<order_id>';
```

---

## Test Summary Matrix

| Test | What It Catches | Pass Criteria |
|------|----------------|---------------|
| **A: Duplicate Webhook** | Race conditions, dedupe failures | Second webhook returns 200 duplicate, no transfers created |
| **B: Crash Between Transfers** | Partial success not handled | Retry creates ONLY missing transfer, no duplicates |
| **C: Partial Refund Twice** | Refund ledger not append-only | TWO ledger entries with DIFFERENT refund IDs |
| **D: Lease Lock** | Concurrent execution | No work performed while lease active |

---

## Quick Smoke Test (All 4 in 5 minutes)

```bash
# Test A: Duplicate webhook
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.succeeded
# Expected: Second returns duplicate

# Test B: Partial success (manual setup required)
# See detailed steps above

# Test C: Partial refund twice
ORDER_ID="<order_id>"
CHARGE_ID="<charge_id>"
stripe refunds create --charge $CHARGE_ID --amount 500
sleep 2
stripe refunds create --charge $CHARGE_ID --amount 500
# Expected: TWO ledger entries

# Test D: Lease lock (manual setup required)
# See detailed steps above
```

---

## Production Monitoring

After deployment, monitor these metrics:

```sql
-- Duplicate webhook rate (should be >0 in prod)
SELECT COUNT(*) as duplicate_webhooks
FROM stripe_events
WHERE status = 'received'
  AND created > now() - interval '24 hours';

-- Failed transfers needing retry
SELECT COUNT(*) as failed_transfers
FROM orders
WHERE transfers_status = 'failed'
  AND created_at > now() - interval '24 hours';

-- Partial refunds (append-only verification)
SELECT 
  order_id,
  COUNT(*) as refund_count,
  array_agg(stripe_object_id ORDER BY created_at) as refund_ids
FROM ledger_entries
WHERE entry_type = 'refund'
  AND created_at > now() - interval '7 days'
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY refund_count DESC;
```

---

**Status**: Ready for execution  
**Duration**: ~15-20 minutes (all 4 tests)  
**Prerequisites**: Stripe CLI, local dev server, admin access

