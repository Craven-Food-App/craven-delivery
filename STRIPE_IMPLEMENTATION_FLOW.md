# Stripe Implementation Flow Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Complete Payment Flow](#complete-payment-flow)
3. [Stripe Connect Onboarding Flow](#stripe-connect-onboarding-flow)
4. [Webhook Processing Flow](#webhook-processing-flow)
5. [Transfer Execution Flow](#transfer-execution-flow)
6. [Refund Flow](#refund-flow)
7. [Admin Operations Flow](#admin-operations-flow)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Key Implementation Details](#key-implementation-details)

---

## Architecture Overview

### DoorDash-Style Marketplace Model

**Core Principle**: Platform (Crave'n) is the merchant of record. All customer payments go to the platform. Connected accounts (restaurants/drivers) receive transfers only.

**Key Characteristics**:
- ✅ Platform collects full payment amount
- ✅ NO destination charges (`transfer_data` removed)
- ✅ NO `on_behalf_of` on PaymentIntent
- ✅ NO `application_fee_amount` on PaymentIntent
- ✅ Transfers created AFTER payment succeeds (webhook-driven)
- ✅ Idempotent operations (lease mechanism + Stripe idempotency keys)
- ✅ Append-only ledger (immutable financial records)

---

## Complete Payment Flow

### Phase 1: Order Creation & Payment Intent

**Step 1: Customer Initiates Checkout**
```
Frontend: Checkout.tsx
├─ User fills cart, selects delivery method, tip, etc.
├─ User selects payment method (Stripe card)
└─ User clicks "Place Order"
```

**Step 2: Create Order Record**
```
Frontend → Edge Function: create-order
├─ Validates cart, calculates totals
├─ Applies promo codes / tester credits
├─ Calculates marketplace splits:
│   ├─ amount_total_cents = subtotal + fees + tax + tip
│   ├─ platform_fee_cents = subtotal × 15%
│   ├─ restaurant_net_cents = subtotal - platform_fee
│   └─ driver_pay_cents = delivery_fee (tip separate)
├─ Creates order record in database
├─ Creates order_items records
└─ Returns order_id
```

**Step 3: Create Payment Intent**
```
Frontend → Edge Function: create-payment
├─ Gets or creates Stripe customer
├─ Calls createPaymentIntent() from _shared/stripe.ts
│   ├─ Creates PaymentIntent on PLATFORM account
│   ├─ NO on_behalf_of
│   ├─ NO transfer_data
│   ├─ NO application_fee_amount
│   ├─ Sets metadata: { order_id, restaurant_id, driver_id, user_id }
│   └─ Returns client_secret
├─ Confirms PaymentIntent immediately (server-side)
└─ Returns payment status
```

**Step 4: Update Order with Payment Info**
```
Edge Function: create-order (continued)
├─ Updates order with:
│   ├─ stripe_payment_intent_id
│   ├─ payment_status = 'succeeded' or 'pending'
│   ├─ amount_total_cents
│   ├─ platform_fee_cents
│   ├─ restaurant_net_cents
│   ├─ driver_pay_cents
│   ├─ currency = 'usd'
│   └─ transfers_status = 'not_started'
└─ Returns success to frontend
```

**Step 5: Frontend Redirect**
```
Frontend: Checkout.tsx
├─ Payment succeeds
├─ Clears cart
└─ Redirects to /payment-success?order_id=...
```

---

### Phase 2: Webhook-Driven Transfers

**Step 6: Stripe Sends Webhook**
```
Stripe → Edge Function: stripe-webhook
├─ Event: payment_intent.succeeded
├─ Event ID: evt_xxxxx
└─ Contains PaymentIntent object with metadata
```

**Step 7: Webhook Deduplication**
```
Edge Function: stripe-webhook
├─ Attempts INSERT into stripe_events:
│   ├─ event_id (PRIMARY KEY)
│   ├─ type = 'payment_intent.succeeded'
│   ├─ metadata = { object_id, amount, metadata }
│   └─ status = 'received'
├─ If duplicate key (23505):
│   └─ Return 200 (already processed)
└─ If successful:
    └─ Continue to handler
```

**Step 8: Lock Order for Transfers**
```
Edge Function → RPC: lock_order_for_transfers
├─ SELECT ... FOR UPDATE (locks row)
├─ Checks transfers_status:
│   ├─ If 'complete': return status_code='complete' (exit)
│   ├─ If 'partial' + lease valid: return status_code='locked' (exit)
│   └─ Otherwise: proceed
├─ Validates split math:
│   └─ platform_fee + restaurant_net + driver_pay + tip == amount_total
├─ Generates lease:
│   ├─ transfers_lease_id = UUID
│   ├─ transfers_lease_expires_at = now() + 5 minutes
│   └─ transfers_status = 'partial'
├─ Persists stripe_payment_intent_id if missing
├─ Re-selects fresh state from database
└─ Returns: status_code='acquired' + order details + lease_id
```

**Step 9: Get Connected Accounts**
```
Edge Function: stripe-webhook
├─ Queries stripe_accounts table:
│   ├─ Restaurant: WHERE owner_type='restaurant' AND owner_id=?
│   └─ Driver: WHERE owner_type='driver' AND owner_id=?
└─ NO payouts_enabled check (transfers allowed even if not ready)
```

**Step 10: Create Transfers (Idempotent)**
```
Edge Function: stripe-webhook
├─ Restaurant Transfer (if restaurant_net_cents > 0):
│   ├─ Check: Is stripe_transfer_restaurant_id already set?
│   ├─ If NO:
│   │   ├─ Create Stripe transfer:
│   │   │   ├─ amount = restaurant_net_cents
│   │   │   ├─ destination = restaurant.stripe_account_id
│   │   │   ├─ idempotencyKey = 'order:${order_id}:transfer:restaurant'
│   │   │   └─ metadata = { order_id, restaurant_id, type: 'restaurant_net' }
│   │   └─ Store transfer ID immediately:
│   │       └─ UPDATE orders SET stripe_transfer_restaurant_id = transfer.id
│   └─ If YES: Skip (already created)
│
└─ Driver Transfer (if driver_pay_cents + tip_cents > 0):
    ├─ Check: Is stripe_transfer_driver_id already set?
    ├─ If NO:
    │   ├─ Create Stripe transfer:
    │   │   ├─ amount = driver_pay_cents + tip_cents
    │   │   ├─ destination = driver.stripe_account_id
    │   │   ├─ idempotencyKey = 'order:${order_id}:transfer:driver'
    │   │   └─ metadata = { order_id, driver_id, type: 'driver_pay_tip' }
    │   └─ Store transfer ID immediately:
    │       └─ UPDATE orders SET stripe_transfer_driver_id = transfer.id
    └─ If YES: Skip (already created)
```

**Step 11: Finalize Order**
```
Edge Function → RPC: finalize_order_transfers
├─ Validates lease_id matches order.transfers_lease_id
├─ Updates order:
│   ├─ transfers_status = 'complete'
│   ├─ transfers_lease_id = NULL
│   ├─ transfers_lease_expires_at = NULL
│   ├─ transfers_error = NULL
│   └─ Stores final transfer IDs
└─ If lease mismatch: Raises exception (prevents double finalize)
```

**Step 12: Write Ledger Entries**
```
Edge Function: stripe-webhook
├─ Upserts ledger entries (idempotent):
│   ├─ customer_charge: amount_total_cents (stripe_object_id = PI ID)
│   ├─ platform_fee: platform_fee_cents
│   ├─ restaurant_net: restaurant_net_cents (stripe_object_id = transfer ID)
│   ├─ driver_pay: driver_pay_cents (stripe_object_id = transfer ID)
│   └─ tip: tip_cents (stripe_object_id = transfer ID)
└─ Uses unique constraint: (order_id, entry_type, owner_type, owner_id)
```

**Step 13: Mark Webhook Processed**
```
Edge Function: stripe-webhook
└─ UPDATE stripe_events SET status='processed', processed_at=now()
```

---

## Stripe Connect Onboarding Flow

### Restaurant Onboarding

**Step 1: Create Connected Account**
```
Admin/System → Edge Function: create-connected-account
├─ Request: { owner_type: 'restaurant', owner_id, email, business_name }
├─ Checks if account already exists in stripe_accounts
├─ Creates Stripe Custom account:
│   ├─ type = 'custom'
│   ├─ country = 'US'
│   ├─ business_type = 'company'
│   ├─ capabilities = { transfers: { requested: true } }
│   └─ NO card_payments capability
├─ Stores in stripe_accounts table
└─ Returns: stripe_account_id
```

**Step 2: Generate Onboarding Link**
```
Admin/System → Edge Function: create-account-link
├─ Request: { stripe_account_id, refresh_url, return_url }
├─ Creates Stripe Account Link:
│   ├─ type = 'account_onboarding'
│   └─ Returns onboarding URL
└─ Restaurant completes Stripe-hosted onboarding
```

**Step 3: Webhook Updates Status**
```
Stripe → Edge Function: stripe-webhook
├─ Event: account.updated
├─ Updates stripe_accounts:
│   ├─ details_submitted
│   ├─ payouts_enabled
│   ├─ charges_enabled
│   └─ requirements
└─ Restaurant can now receive transfers
```

### Driver Onboarding

**Same flow as restaurant, but:**
- `business_type = 'individual'`
- Uses `first_name` and `last_name` instead of `business_name`

---

## Webhook Processing Flow

### Event Deduplication

```
Stripe Webhook Received
│
├─ Extract event_id (evt_xxxxx)
├─ Attempt INSERT into stripe_events:
│   ├─ event_id (PRIMARY KEY)
│   ├─ type
│   ├─ created
│   ├─ metadata (minimal: object_id, amount, metadata)
│   └─ status = 'received'
│
├─ If INSERT succeeds:
│   └─ Process event → Update status='processed'
│
└─ If INSERT fails (23505 duplicate key):
    └─ Return 200 (already processed, skip handler)
```

### Event Handler Routing

```
Webhook Handler
│
├─ account.updated
│   └─ Update stripe_accounts status
│
├─ payment_intent.succeeded
│   └─ Execute transfer flow (see Phase 2 above)
│
├─ payment_intent.payment_failed
│   └─ Mark order payment_status='failed'
│
├─ charge.refunded
│   └─ Process refund (see Refund Flow)
│
└─ checkout.session.completed (CraveMore)
    └─ Create user_membership
```

---

## Transfer Execution Flow

### Lease Mechanism (Concurrency Safety)

```
Concurrent Webhook Workers
│
├─ Worker 1: Calls lock_order_for_transfers
│   ├─ Acquires lease (transfers_lease_id = UUID-1)
│   ├─ Sets transfers_status = 'partial'
│   └─ Sets lease_expires_at = now() + 5 min
│
├─ Worker 2: Calls lock_order_for_transfers (concurrent)
│   ├─ Sees transfers_status = 'partial'
│   ├─ Sees lease_expires_at > now()
│   └─ Returns status_code='locked' (exits cleanly)
│
└─ Worker 1: Completes transfers
    ├─ Creates Stripe transfers
    ├─ Calls finalize_order_transfers(lease_id=UUID-1)
    └─ Clears lease
```

### Partial Success Protection

```
Transfer Creation
│
├─ Restaurant Transfer:
│   ├─ Create transfer via Stripe API
│   ├─ Store transfer ID immediately:
│   │   └─ UPDATE orders SET stripe_transfer_restaurant_id = 'tr_xxx'
│   └─ If this fails, transfer ID still stored
│
├─ Driver Transfer:
│   ├─ Create transfer via Stripe API
│   ├─ Store transfer ID immediately:
│   │   └─ UPDATE orders SET stripe_transfer_driver_id = 'tr_yyy'
│   └─ If this fails, transfer ID still stored
│
└─ Finalize:
    └─ Only updates status, doesn't recreate transfers
```

### Retry Logic

```
Admin Retry: admin-retry-transfers
│
├─ Lock order (acquires lease)
├─ Check existing transfer IDs:
│   ├─ If restaurant_transfer_id exists: Skip restaurant transfer
│   └─ If driver_transfer_id exists: Skip driver transfer
│
├─ Create only missing transfers:
│   ├─ Uses same idempotency keys
│   └─ Stripe returns existing transfer if key matches
│
└─ Finalize with lease validation
```

---

## Refund Flow

### Full Refund

```
Stripe → Webhook: charge.refunded
│
├─ Extract charge.payment_intent
├─ Find order by stripe_payment_intent_id
│
├─ Determine refund type:
│   ├─ If amount_refunded >= amount:
│   │   └─ payment_status = 'refunded'
│   └─ If amount_refunded < amount:
│       └─ payment_status = 'partial_refund'
│
├─ Get latest refund object:
│   ├─ refunds = charge.refunds?.data ?? []
│   ├─ latestRefund = refunds[refunds.length - 1]
│   └─ refundKey = latestRefund?.id ?? eventId
│
├─ INSERT refund ledger entry (append-only):
│   ├─ entry_type = 'refund'
│   ├─ amount_cents = -refundAmount (negative)
│   ├─ stripe_object_id = refundKey (latest refund ID)
│   └─ If duplicate key (23505): Treat as success
│
└─ Update order payment_status
```

### Partial Refund (Multiple)

```
Scenario: $20 order, refund $5, then refund $5 more
│
├─ First Refund ($5):
│   ├─ payment_status = 'partial_refund'
│   ├─ Ledger entry: amount_cents = -500, stripe_object_id = 're_001'
│   └─ Unique constraint: (order_id, 'refund', 're_001')
│
├─ Second Refund ($5):
│   ├─ payment_status = 'partial_refund' (still)
│   ├─ Ledger entry: amount_cents = -500, stripe_object_id = 're_002'
│   └─ Unique constraint: (order_id, 'refund', 're_002')
│
└─ Result: Two separate ledger entries (append-only)
```

### Missing Payment Intent Handling

```
If charge.payment_intent is NULL:
│
├─ Write ops alert:
│   ├─ INSERT into stripe_events:
│   │   ├─ event_id = 'refund-missing-pi-${eventId}'
│   │   ├─ type = 'charge.refunded.missing_payment_intent'
│   │   └─ status = 'failed'
│   └─ Exit cleanly (don't throw)
│
└─ Admin can investigate via needs_attention view
```

---

## Admin Operations Flow

### Payments Portal Access

```
Admin User → /admin/payments
│
├─ Orders Tab:
│   ├─ Dense table with filters:
│   │   ├─ payment_status
│   │   ├─ transfers_status
│   │   ├─ date range
│   │   └─ search by order ID / PI ID
│   ├─ Click row → Order Drawer:
│   │   ├─ Summary: Splits breakdown
│   │   ├─ Ledger: All ledger entries
│   │   ├─ Stripe: Links to Stripe Dashboard
│   │   └─ Actions: Retry transfers, Refund
│   └─ Shows Stripe IDs with external links
│
├─ Connected Accounts Tab:
│   ├─ Lists all restaurants + drivers
│   ├─ Shows: details_submitted, payouts_enabled, requirements
│   └─ Action: Refresh status, Generate onboarding link
│
└─ Needs Attention Tab:
    ├─ Failed transfers
    ├─ Failed payments
    ├─ Partial refunds
    └─ Refunded orders with transfers
```

### Retry Failed Transfers

```
Admin → Order Drawer → Actions → Retry Transfers
│
├─ Frontend → Edge Function: admin-retry-transfers
│   ├─ Auth: Verify admin role (anon client)
│   ├─ Lock order via RPC (acquires lease)
│   ├─ Check status_code:
│   │   ├─ 'complete': Return success (already done)
│   │   ├─ 'locked': Return success (another worker processing)
│   │   └─ 'acquired': Proceed
│   │
│   ├─ Get connected accounts
│   ├─ Check existing transfer IDs:
│   │   ├─ If restaurant_transfer_id exists: Skip
│   │   └─ If driver_transfer_id exists: Skip
│   │
│   ├─ Create only missing transfers:
│   │   ├─ Uses Stripe idempotency keys
│   │   └─ Stores transfer IDs immediately
│   │
│   ├─ Finalize via RPC (lease validated)
│   └─ Repair ledger entries (upsert non-refund)
│
└─ Returns success to frontend
```

### Issue Refund

```
Admin → Order Drawer → Actions → Issue Refund
│
├─ Frontend → Edge Function: process-refund (TODO: implement)
│   ├─ Creates Stripe refund:
│   │   ├─ charge = order.stripe_payment_intent_id
│   │   └─ amount = full or partial
│   │
│   ├─ Webhook processes refund (see Refund Flow)
│   └─ Updates order + ledger
│
└─ Order appears in needs_attention if transfers exist
```

---

## Error Handling & Recovery

### Transfer Failure Scenarios

**Scenario 1: Restaurant Account Not Ready**
```
Webhook: payment_intent.succeeded
│
├─ Lock order (acquires lease)
├─ Get restaurant account: payouts_enabled = false
├─ Attempt transfer creation
│   └─ Stripe rejects (account not ready)
│
├─ Mark as failed:
│   ├─ Call mark_transfer_failed RPC
│   ├─ transfers_status = 'failed'
│   ├─ transfers_error = 'Restaurant account not ready'
│   └─ Lease cleared
│
└─ Order appears in needs_attention queue
    └─ Admin can retry after restaurant completes onboarding
```

**Scenario 2: Network Error During Transfer**
```
Webhook: payment_intent.succeeded
│
├─ Lock order (acquires lease)
├─ Create restaurant transfer: ✅ Success
│   └─ Store transfer ID immediately
│
├─ Create driver transfer: ❌ Network timeout
│
├─ Mark as failed:
│   ├─ transfers_status = 'failed'
│   ├─ transfers_error = 'Network timeout'
│   ├─ stripe_transfer_restaurant_id = 'tr_xxx' (preserved)
│   └─ stripe_transfer_driver_id = NULL
│
└─ Admin retry:
    ├─ Only creates driver transfer (restaurant already done)
    └─ Finalizes successfully
```

**Scenario 3: Concurrent Webhook Delivery**
```
Stripe sends same webhook twice (network retry)
│
├─ Webhook 1:
│   ├─ INSERT stripe_events: ✅ Success
│   ├─ Lock order: ✅ Acquires lease
│   └─ Processing...
│
├─ Webhook 2 (concurrent):
│   ├─ INSERT stripe_events: ❌ Duplicate key (23505)
│   └─ Return 200 (already processed)
│
└─ Webhook 1: Completes successfully
```

### Lease Expiration

```
Order locked with lease (5 min expiry)
│
├─ Worker crashes before finalizing
│   └─ Lease expires after 5 minutes
│
├─ Next webhook/retry:
│   ├─ Sees transfers_status = 'partial'
│   ├─ Sees lease_expires_at < now() (expired)
│   └─ Acquires new lease (can proceed)
│
└─ Uses existing transfer IDs (if any) to avoid duplicates
```

---

## Data Flow Diagrams

### Payment Flow Sequence

```
Customer          Frontend          Edge Functions          Stripe          Database
   │                 │                     │                  │                │
   │─── Checkout ────>│                     │                  │                │
   │                 │─── create-order ───>│                  │                │
   │                 │                     │──────────────────┼─── INSERT ────>│
   │                 │<─── order_id ────────│                  │                │
   │                 │                     │                  │                │
   │                 │─── create-payment ─>│                  │                │
   │                 │                     │─── Create PI ────>│                │
   │                 │                     │<─── client_secret │                │
   │                 │                     │─── Confirm PI ────>│                │
   │                 │                     │<─── succeeded ────│                │
   │                 │<─── success ────────│                  │                │
   │                 │─────────────────────┼─── UPDATE ───────>│                │
   │                 │                     │                  │                │
   │<─── Success ────│                     │                  │                │
   │                 │                     │                  │                │
   │                 │                     │                  │─── Webhook ────>│
   │                 │                     │<─── payment_intent.succeeded       │
   │                 │                     │                  │                │
   │                 │                     │─── Lock Order ────┼─── RPC ───────>│
   │                 │                     │<─── lease_id ─────│                │
   │                 │                     │                  │                │
   │                 │                     │─── Create Transfers ──────────────>│
   │                 │                     │<─── transfer_ids ──────────────────│
   │                 │                     │                  │                │
   │                 │                     │─── Store IDs ────┼─── UPDATE ────>│
   │                 │                     │                  │                │
   │                 │                     │─── Finalize ──────┼─── RPC ───────>│
   │                 │                     │                  │                │
   │                 │                     │─── Write Ledger ─┼─── UPSERT ────>│
```

### Transfer Execution (Detailed)

```
Webhook Handler
│
├─ INSERT stripe_events (dedupe)
│   └─ If duplicate: Exit
│
├─ RPC: lock_order_for_transfers
│   ├─ SELECT ... FOR UPDATE
│   ├─ Check status:
│   │   ├─ 'complete' → Exit
│   │   ├─ 'partial' + lease valid → Exit
│   │   └─ Otherwise → Acquire lease
│   └─ Return fresh state
│
├─ Get connected accounts
│   └─ Query stripe_accounts
│
├─ Create restaurant transfer (if missing)
│   ├─ Stripe API: transfers.create
│   ├─ Idempotency: order:${id}:transfer:restaurant
│   └─ Store ID immediately
│
├─ Create driver transfer (if missing)
│   ├─ Stripe API: transfers.create
│   ├─ Idempotency: order:${id}:transfer:driver
│   └─ Store ID immediately
│
├─ RPC: finalize_order_transfers
│   ├─ Validate lease_id matches
│   ├─ Set transfers_status = 'complete'
│   └─ Clear lease
│
└─ Write ledger entries
    └─ Upsert (idempotent)
```

---

## Key Implementation Details

### Idempotency Strategy

**Three Layers**:
1. **Webhook Dedupe**: Unique `event_id` in `stripe_events` table
2. **Lease Mechanism**: `transfers_lease_id` prevents concurrent execution
3. **Stripe Idempotency Keys**: `order:${order_id}:transfer:restaurant` / `:driver`

### Split Calculation

**Formula**:
```
amount_total_cents = subtotal + delivery_fee + tax + tip
platform_fee_cents = subtotal × 15%
restaurant_net_cents = subtotal - platform_fee_cents
driver_pay_cents = delivery_fee
driver_total = driver_pay_cents + tip_cents

Validation: platform_fee + restaurant_net + driver_pay + tip == amount_total
```

### Ledger Entry Types

**Standard Entries** (Upsert):
- `customer_charge`: Full order amount
- `platform_fee`: 15% platform fee
- `restaurant_net`: Restaurant payout
- `driver_pay`: Driver delivery fee
- `tip`: Driver tip

**Refund Entries** (INSERT only):
- `refund`: Negative amount, unique per refund object ID

### RPC Function Security

**All transfer-related RPCs**:
- `SECURITY DEFINER` functions
- Execute permissions: `service_role` ONLY
- Revoked from: `PUBLIC`, `anon`, `authenticated`
- Edge Functions must use service role key to call RPC

### RLS Policies

**Admin-Only Tables**:
- `stripe_accounts`: Admin access only
- `stripe_events`: Admin access only
- `ledger_entries`: Admin access only (USING + WITH CHECK)

**Access Control**:
- CEO email: `tstroman.ceo@cravenusa.com` (universal access)
- Admin roles: `admin`, `ceo`, `super_admin` via `user_roles` table

---

## Environment Setup

### Required Environment Variables

**Backend (Edge Functions)**:
- `STRIPE_SECRET_KEY`: Platform Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for RPC)

**Frontend**:
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key

### Webhook Configuration

**Stripe Dashboard**:
- Endpoint: `https://[project].supabase.co/functions/v1/stripe-webhook`
- Events to listen:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated`
  - `checkout.session.completed` (CraveMore)
  - `customer.subscription.*` (CraveMore)

---

## Testing Checklist

### Manual Testing

1. **Happy Path**:
   - ✅ Create order → Payment succeeds → Transfers created → Ledger written

2. **Webhook Deduplication**:
   - ✅ Send same webhook twice → Second returns 200 duplicate

3. **Concurrent Webhooks**:
   - ✅ Send same webhook concurrently → Only one processes

4. **Transfer Failure**:
   - ✅ Break restaurant account → Transfer fails → Order in needs_attention
   - ✅ Fix account → Admin retry → Only missing transfer created

5. **Partial Refund**:
   - ✅ Refund $5 of $20 → `payment_status='partial_refund'` → Ledger entry
   - ✅ Refund $5 more → New ledger entry (append-only)

6. **Lease Expiration**:
   - ✅ Lock order → Wait 5+ min → New webhook acquires lease

### Stripe CLI Testing

```bash
# Test payment success
stripe trigger payment_intent.succeeded

# Test duplicate webhook
stripe trigger payment_intent.succeeded
# Immediately trigger again with same event

# Test refund
stripe refunds create --charge=CHARGE_ID --amount=500

# Test account update
stripe trigger account.updated
```

---

## File Reference

### Core Implementation Files

**Migrations**:
- `supabase/migrations/20260218000001_stripe_marketplace_refactor.sql` - Base schema
- `supabase/migrations/20260218000004_stripe_marketplace_hardening_patch.sql` - Production hardening

**Edge Functions**:
- `supabase/functions/stripe-webhook/index.ts` - Webhook handler
- `supabase/functions/create-payment-intent/index.ts` - PaymentIntent creation
- `supabase/functions/create-payment/index.ts` - Payment processing
- `supabase/functions/create-order/index.ts` - Order creation with splits
- `supabase/functions/admin-retry-transfers/index.ts` - Admin retry endpoint
- `supabase/functions/create-connected-account/index.ts` - Connect account creation
- `supabase/functions/create-account-link/index.ts` - Onboarding link generation
- `supabase/functions/get-connect-status/index.ts` - Account status check
- `supabase/functions/_shared/stripe.ts` - Shared utilities

**Frontend**:
- `src/pages/Checkout.tsx` - Checkout flow
- `src/pages/PaymentMethods.tsx` - Payment method management
- `src/pages/admin/payments/PaymentsPortal.tsx` - Admin console
- `src/pages/admin/payments/OrdersTable.tsx` - Orders table
- `src/pages/admin/payments/OrderDrawer.tsx` - Order details
- `src/pages/admin/payments/ConnectedAccountsTable.tsx` - Connect accounts
- `src/pages/admin/payments/NeedsAttentionQueue.tsx` - Failed orders queue

---

## Production Safety Features

### Zero Double-Pay Risk
- ✅ Lease mechanism prevents concurrent execution
- ✅ Idempotency keys prevent duplicate Stripe transfers
- ✅ Transfer IDs stored immediately (partial success safe)
- ✅ Lease validation on finalize (prevents double finalize)

### Idempotent Operations
- ✅ INSERT-first webhook deduplication
- ✅ Status code checks (`complete`/`locked`/`acquired`)
- ✅ Partial success handling (store each transfer ID immediately)
- ✅ Retry only creates missing transfers

### Operationally Recoverable
- ✅ Admin retry endpoint for failed transfers
- ✅ Needs attention queue for failed orders
- ✅ Ledger repair after retry
- ✅ Append-only refunds (audit trail)

### Data Integrity
- ✅ Split math validation in RPC
- ✅ Fresh state return (re-selects after UPDATE)
- ✅ Immutable ledger entries
- ✅ Unique constraints prevent duplicates

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-18  
**Status**: Production-ready implementation

This document covers the end-to-end Stripe implementation flow for the Crave'n marketplace platform.

