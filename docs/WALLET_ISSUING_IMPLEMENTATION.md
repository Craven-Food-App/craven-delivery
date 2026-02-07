# Crave'n Wallet + Stripe Issuing Implementation

**Date:** 2026-02-03  
**Status:** ✅ Complete - Ready for Deployment  
**System:** Driver Earnings Wallet with Feeder Card Authorization

---

## Executive Summary

Implemented production-safe wallet system enabling drivers to spend earnings via Stripe Issuing cards with real-time authorization decisions based on available balance.

**Key Features:**
- Atomic wallet reservations (no race conditions)
- Idempotent webhook processing (safe retries)
- Fail-closed authorization (decline on any error)
- Complete reconciliation via append-only ledger

---

## Architecture Overview

### Database Schema

**driver_wallet**
- `available_cents` - Spendable balance (earnings minus payouts)
- `reserved_cents` - Funds held for pending card authorizations
- Spendable balance = `available_cents - reserved_cents`

**driver_cards**
- Maps Stripe Issuing card IDs to driver accounts
- Status: active, frozen, closed

**wallet_ledger** (append-only)
- All wallet transactions logged with stripe_auth_id/stripe_txn_id
- Types: earnings_credit, card_auth_hold, card_auth_release, card_clearing_debit

### Authorization Flow

```
1. Driver swipes card at merchant
2. Stripe sends issuing_authorization.request webhook
3. We lookup driver_id from issuing_card_id
4. Call reserve_wallet_for_card_auth(driver_id, amount, auth_id)
   - Atomically checks spendable balance
   - If sufficient: reserve funds, return APPROVE
   - If insufficient: return DECLINE
5. Stripe processes authorization
6. Transaction clears (issuing_transaction.created)
7. Call finalize_wallet_clearing(driver_id, held_amount, cleared_amount, auth_id, txn_id)
   - Releases hold (reserved_cents -= held_amount)
   - Debits balance (available_cents -= cleared_amount)
```

### Reversal/Expiration Flow

```
1. Authorization reversed/expired (issuing_authorization.updated)
2. Call release_wallet_hold(driver_id, amount, auth_id)
3. Reserved funds released back to available balance
```

---

## Files Modified/Created

### Database Migration
**`supabase/migrations/20260203160000_driver_wallet_and_issuing_cards.sql`**
- Creates driver_wallet, driver_cards, wallet_ledger tables
- RLS policies (drivers can SELECT own data)
- RPC functions:
  - `reserve_wallet_for_card_auth` - Atomic authorization
  - `release_wallet_hold` - Release authorization hold
  - `finalize_wallet_clearing` - Finalize transaction
  - `credit_wallet_from_earnings` - Mirror earnings into wallet

### Edge Functions

**`supabase/functions/finalize-delivery/index.ts`**
- Added call to `credit_wallet_from_earnings` after inserting driver_earnings
- Mirrors delivery earnings into wallet (available for card spends)

**`supabase/functions/stripe-webhook/index.ts`**
- Added Issuing event handlers:
  - `issuing_authorization.request` - Real-time approve/decline
  - `issuing_authorization.updated` - Handle reversals/expirations
  - `issuing_transaction.created` - Finalize clearing
- Helper functions: `approveAuthorization`, `declineAuthorization`

**`supabase/functions/link-issuing-card/index.ts`** (new)
- Authenticated endpoint to link Issuing card to driver
- Stub for full provisioning flow (cardholder + card creation)

---

## Environment Variables

Add to Supabase Edge Function secrets:

```bash
STRIPE_SECRET_KEY=sk_live_...  # Already configured
STRIPE_WEBHOOK_SECRET=whsec_... # Already configured
STRIPE_ISSUING_ENABLED=true    # New: set to false to disable Issuing processing
```

---

## Deployment Checklist

### 1. Database Migration
```bash
# Push migration to Supabase
supabase db push

# Or via Supabase dashboard:
# - Navigate to SQL Editor
# - Run migration file manually
```

### 2. Deploy Edge Functions
```bash
# Deploy updated functions
supabase functions deploy finalize-delivery
supabase functions deploy stripe-webhook
supabase functions deploy link-issuing-card

# Set environment variable
supabase secrets set STRIPE_ISSUING_ENABLED=true
```

### 3. Configure Stripe Webhook
- In Stripe Dashboard > Developers > Webhooks
- Add endpoint: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
- Enable events:
  - `issuing_authorization.request`
  - `issuing_authorization.updated`
  - `issuing_transaction.created`
- Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Verify Integration
```bash
# Test webhook locally
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger issuing_authorization.request
```

---

## Testing Scenarios

### Test 1: Successful Authorization
**Setup:** Driver has $100 available balance  
**Action:** Authorize $50 card purchase  
**Expected:**
- `reserve_wallet_for_card_auth` returns true
- `available_cents` = 100, `reserved_cents` = 50
- Authorization approved
- Spendable balance = $50

### Test 2: Insufficient Funds
**Setup:** Driver has $10 available balance  
**Action:** Authorize $50 card purchase  
**Expected:**
- `reserve_wallet_for_card_auth` returns false
- Authorization declined
- Balance unchanged

### Test 3: Concurrent Authorizations
**Setup:** Driver has $60 available  
**Action:** Two simultaneous $50 authorization requests  
**Expected:**
- First approved, second declined
- No race condition (row-level lock prevents double-spend)

### Test 4: Authorization Reversal
**Setup:** Approved $50 authorization  
**Action:** Merchant reverses authorization  
**Expected:**
- `release_wallet_hold` called
- `reserved_cents` decreases by $50
- Funds available for new authorizations

### Test 5: Partial Capture
**Setup:** Authorized $100, merchant captures $80  
**Action:** Transaction clears for $80  
**Expected:**
- `reserved_cents` -= 100
- `available_cents` -= 80
- Net effect: $20 saved (tip adjustment scenario)

### Test 6: Webhook Retry Idempotency
**Setup:** Stripe retries authorization webhook  
**Action:** Same auth_id sent twice  
**Expected:**
- First call reserves funds
- Second call checks ledger, finds existing auth_id, returns approved without re-reserving
- Balance reserved only once

---

## Production Safety Features

### Atomicity
- All RPC functions use `SELECT ... FOR UPDATE` row locks
- Prevents race conditions on concurrent authorization requests
- Ensures balance consistency

### Idempotency
- Unique indexes on `stripe_auth_id` and `stripe_txn_id` in wallet_ledger
- Webhook retries safely handled (no double-reserve/double-debit)
- RPC functions check ledger before processing

### Fail-Closed Authorization
```typescript
// Any of these conditions = DECLINE:
- Card not found in driver_cards
- Card status != 'active'
- Database error during reserve
- Insufficient funds
- Exception thrown in handler
```

### Reconciliation
- Append-only `wallet_ledger` table
- Every wallet operation logged with Stripe object IDs
- Audit trail for disputes/reconciliation
- Can replay ledger to rebuild balances

---

## Future Enhancements

### Phase 2: Full Card Provisioning
- Implement cardholder creation (Stripe Issuing API)
- Physical card issuance and shipping
- Virtual card instant provisioning
- Card PIN management

### Phase 3: Spending Controls
- Daily/weekly spending limits
- Merchant category restrictions (gas stations only)
- Location-based authorization (geofencing)
- Real-time driver notifications

### Phase 4: Advanced Features
- Cashback/rewards on card spends
- Split transactions (personal vs business)
- Receipt capture and categorization
- Tax deduction optimization

---

## API Reference

### RPC Functions

#### reserve_wallet_for_card_auth
```sql
SELECT reserve_wallet_for_card_auth(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_stripe_auth_id TEXT
) → BOOLEAN
```
Returns `true` (approve) or `false` (decline). Idempotent.

#### release_wallet_hold
```sql
SELECT release_wallet_hold(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_stripe_auth_id TEXT
) → VOID
```
Releases reserved funds. Idempotent.

#### finalize_wallet_clearing
```sql
SELECT finalize_wallet_clearing(
  p_driver_id UUID,
  p_held_amount_cents INTEGER,
  p_cleared_amount_cents INTEGER,
  p_stripe_auth_id TEXT,
  p_stripe_txn_id TEXT
) → VOID
```
Finalizes transaction clearing. Idempotent.

#### credit_wallet_from_earnings
```sql
SELECT credit_wallet_from_earnings(
  p_driver_id UUID,
  p_amount_cents INTEGER,
  p_order_id UUID
) → VOID
```
Credits wallet from delivery earnings.

---

## Monitoring & Alerts

### Key Metrics to Track
- Authorization approval rate
- Average hold-to-clearing time
- Declined authorizations by reason
- Wallet balance vs earnings discrepancies
- Ledger reconciliation errors

### Alert Conditions
- Approval rate < 95% (investigate insufficient funds pattern)
- Authorization processing time > 500ms (Stripe timeout risk)
- Reserved funds not cleared after 7 days (merchant issue)
- Wallet balance goes negative (critical error)

---

## Support & Troubleshooting

### Common Issues

**Q: Authorization declined but driver has sufficient balance**  
A: Check `reserved_cents` - funds may be held by pending authorizations. Review `wallet_ledger` for unreleased holds.

**Q: Reserved funds stuck after authorization**  
A: Stripe may not have sent clearing webhook. Manually call `release_wallet_hold` or wait for automatic expiration (typically 7 days).

**Q: Balance mismatch between driver_earnings and driver_wallet**  
A: Query `wallet_ledger` to audit all transactions. Ensure `credit_wallet_from_earnings` is called for all deliveries.

### Database Queries for Support

```sql
-- Check driver wallet status
SELECT * FROM driver_wallet WHERE driver_id = '<driver_id>';

-- View recent wallet transactions
SELECT * FROM wallet_ledger 
WHERE driver_id = '<driver_id>' 
ORDER BY created_at DESC 
LIMIT 20;

-- Find stuck authorizations (held > 24 hours)
SELECT 
  wl.*,
  dc.issuing_card_id
FROM wallet_ledger wl
JOIN driver_cards dc ON dc.driver_id = wl.driver_id
WHERE wl.type = 'card_auth_hold'
AND wl.created_at < NOW() - INTERVAL '24 hours'
AND NOT EXISTS (
  SELECT 1 FROM wallet_ledger wl2
  WHERE wl2.stripe_auth_id = wl.stripe_auth_id
  AND wl2.type IN ('card_auth_release', 'card_clearing_debit')
);

-- Reconcile wallet balance from ledger
SELECT 
  driver_id,
  SUM(amount_cents) as ledger_balance
FROM wallet_ledger
WHERE driver_id = '<driver_id>'
GROUP BY driver_id;
```

---

## Security Considerations

### RLS Policies
- Drivers can SELECT their own wallet/cards/ledger
- Only service_role can INSERT/UPDATE (via Edge Functions)
- Torrance Stroman (CEO) has full admin access

### Webhook Security
- Stripe signature verification (existing)
- Event deduplication via stripe_events table (existing)
- Rate limiting on webhook endpoint (existing)

### Authorization Security
- Fail-closed on all errors
- Card status validation
- Row-level locking prevents race conditions
- Idempotent processing prevents double-spends

---

## Compliance Notes

### Financial Records
- All transactions logged in append-only ledger
- Stripe object IDs stored for reconciliation
- Audit trail meets financial compliance requirements

### Driver Transparency
- Drivers can view wallet balance and transaction history
- Real-time notifications on card authorizations (future)
- Monthly statements (future)

---

## Technical Debt & Known Limitations

### Current Limitations
1. Card provisioning not implemented (requires Stripe Issuing account setup)
2. No daily spending limits enforced
3. No real-time driver notifications on card use
4. No receipt/expense categorization
5. Payout deductions not integrated (drivers can't cash out if reserved)

### Recommended Next Steps
1. Implement spending limits to prevent overdrafts
2. Add real-time driver notifications (SMS/push)
3. Integrate wallet balance checks in payout flow
4. Build admin dashboard for card management
5. Implement fraud detection rules

---

## Contact

**Implementation Lead:** Invero AI  
**Business Owner:** Torrance Stroman, CEO  
**Technical Review:** Required before production deployment  

**Documentation Date:** February 3, 2026  
**Next Review:** After first 1,000 card transactions










