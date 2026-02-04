# Wallet + Issuing Deployment Quick Reference

**Status:** Ready for Production Deployment  
**Date:** 2026-02-03

---

## Pre-Deployment Checklist

- [ ] Review all migration SQL changes
- [ ] Verify Stripe API key has Issuing permissions
- [ ] Confirm webhook endpoint is production-ready
- [ ] Test authorization flow in Stripe test mode
- [ ] Review security policies and RLS rules
- [ ] Set up monitoring/alerting for authorization failures

---

## Deployment Commands

### 1. Deploy Database Migration

```bash
# Option A: Using Supabase CLI
cd supabase
supabase db push

# Option B: Via SQL Editor in Supabase Dashboard
# Copy contents of: migrations/20260203160000_driver_wallet_and_issuing_cards.sql
# Paste into SQL Editor and run
```

**Expected Results:**
- 3 new tables: driver_wallet, driver_cards, wallet_ledger
- 4 new RPC functions
- RLS policies enabled

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('driver_wallet', 'driver_cards', 'wallet_ledger');

-- Check RPC functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%wallet%';
```

### 2. Deploy Edge Functions

```bash
# Deploy updated functions
supabase functions deploy finalize-delivery
supabase functions deploy stripe-webhook
supabase functions deploy link-issuing-card
```

**Verification:**
```bash
# Test finalize-delivery (should return 200)
curl -X POST https://[project-ref].supabase.co/functions/v1/finalize-delivery \
  -H "Authorization: Bearer [anon-key]" \
  -d '{"test": true}'

# Test stripe-webhook (should reject without signature)
curl -X POST https://[project-ref].supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 3. Set Environment Variables

```bash
# Set Issuing enabled flag
supabase secrets set STRIPE_ISSUING_ENABLED=true

# Verify secrets (should see STRIPE_ISSUING_ENABLED)
supabase secrets list
```

### 4. Configure Stripe Webhook

**In Stripe Dashboard:**
1. Go to: Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `issuing_authorization.request`
   - `issuing_authorization.updated`
   - `issuing_transaction.created`
5. Copy webhook signing secret
6. Update Supabase secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Post-Deployment Testing

### Test 1: Wallet Crediting (Driver Earnings)
```bash
# Complete a delivery as normal
# Check wallet was credited:
SELECT * FROM driver_wallet WHERE driver_id = '[test-driver-id]';

# Expected: available_cents = earnings amount, reserved_cents = 0
```

### Test 2: Card Authorization (Test Mode)
```bash
# Using Stripe CLI
stripe listen --forward-to https://[project-ref].supabase.co/functions/v1/stripe-webhook

# In another terminal
stripe trigger issuing_authorization.request

# Check logs for:
# - "[Issuing Auth] Request: ..."
# - "[Issuing Auth] DECLINED: ... - card_not_mapped" (expected, no test card linked)
```

### Test 3: Link Test Card
```bash
# Create test card in Stripe Dashboard (Issuing > Cards)
# Link to test driver:
curl -X POST https://[project-ref].supabase.co/functions/v1/link-issuing-card \
  -H "Authorization: Bearer [driver-jwt-token]" \
  -H "Content-Type: application/json" \
  -d '{"issuing_card_id": "ic_test_..."}'

# Expected: {"success": true, "card": {...}}
```

### Test 4: Full Authorization Flow
```bash
# 1. Give test driver some balance
INSERT INTO driver_wallet (driver_id, available_cents) 
VALUES ('[test-driver-id]', 10000); -- $100

# 2. Trigger authorization via Stripe CLI or test purchase
# 3. Check webhook logs for APPROVED/DECLINED decision
# 4. Verify reserved_cents updated:
SELECT * FROM driver_wallet WHERE driver_id = '[test-driver-id]';
SELECT * FROM wallet_ledger WHERE driver_id = '[test-driver-id]' ORDER BY created_at DESC;
```

---

## Rollback Plan

### If Issues Arise During Deployment

**Step 1: Disable Issuing Processing**
```bash
# Set flag to false (webhook will still respond 200 OK but skip processing)
supabase secrets set STRIPE_ISSUING_ENABLED=false
```

**Step 2: Revert Edge Functions (if needed)**
```bash
# Redeploy previous version from git
git checkout HEAD~1 supabase/functions/stripe-webhook/index.ts
supabase functions deploy stripe-webhook

git checkout HEAD~1 supabase/functions/finalize-delivery/index.ts
supabase functions deploy finalize-delivery
```

**Step 3: Database Rollback (if critical)**
```sql
-- CAUTION: Only if migration causes issues
-- This will drop all wallet data

DROP TABLE IF EXISTS public.wallet_ledger CASCADE;
DROP TABLE IF EXISTS public.driver_cards CASCADE;
DROP TABLE IF EXISTS public.driver_wallet CASCADE;

DROP FUNCTION IF EXISTS public.reserve_wallet_for_card_auth;
DROP FUNCTION IF EXISTS public.release_wallet_hold;
DROP FUNCTION IF EXISTS public.finalize_wallet_clearing;
DROP FUNCTION IF EXISTS public.credit_wallet_from_earnings;
```

---

## Monitoring Queries

### Active Authorizations
```sql
-- Show all pending authorizations (reserved but not cleared)
SELECT 
  dw.driver_id,
  u.email,
  dw.available_cents,
  dw.reserved_cents,
  (dw.available_cents - dw.reserved_cents) as spendable_cents,
  dw.updated_at
FROM driver_wallet dw
JOIN auth.users u ON u.id = dw.driver_id
WHERE dw.reserved_cents > 0
ORDER BY dw.updated_at DESC;
```

### Recent Authorization Decisions
```sql
-- View recent authorization attempts from webhook logs
SELECT 
  event_id,
  type,
  created,
  status,
  metadata->>'object_id' as auth_id,
  metadata->>'amount' as amount_cents
FROM stripe_events
WHERE type LIKE 'issuing_authorization%'
ORDER BY created DESC
LIMIT 20;
```

### Wallet Balance Summary
```sql
-- Summary of all driver wallet balances
SELECT 
  COUNT(*) as total_drivers,
  SUM(available_cents) as total_available,
  SUM(reserved_cents) as total_reserved,
  SUM(available_cents - reserved_cents) as total_spendable,
  AVG(available_cents) as avg_balance
FROM driver_wallet;
```

### Transaction Volume
```sql
-- Daily card transaction volume
SELECT 
  DATE(created_at) as transaction_date,
  COUNT(*) as transaction_count,
  SUM(amount_cents) as total_amount,
  AVG(amount_cents) as avg_amount
FROM wallet_ledger
WHERE type IN ('card_auth_hold', 'card_clearing_debit')
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY transaction_date DESC;
```

---

## Common Issues & Fixes

### Issue: Authorization always declined
**Symptoms:** All card swipes declined, logs show "insufficient funds" or "card_not_mapped"  
**Check:**
```sql
-- Is card linked?
SELECT * FROM driver_cards WHERE issuing_card_id = 'ic_...';

-- Does driver have balance?
SELECT * FROM driver_wallet WHERE driver_id = '...';
```
**Fix:** Link card or credit wallet with test funds.

---

### Issue: Reserved funds never cleared
**Symptoms:** `reserved_cents` stays high, never decreases  
**Check:**
```sql
-- Find old holds without clearing
SELECT * FROM wallet_ledger 
WHERE type = 'card_auth_hold' 
AND created_at < NOW() - INTERVAL '24 hours'
AND stripe_auth_id NOT IN (
  SELECT stripe_auth_id FROM wallet_ledger 
  WHERE type IN ('card_clearing_debit', 'card_auth_release')
);
```
**Fix:** Manually release old holds:
```sql
SELECT release_wallet_hold('[driver-id]', [amount], '[auth-id]');
```

---

### Issue: Webhook not receiving Issuing events
**Symptoms:** No log entries for Issuing auth requests  
**Check:**
- Stripe webhook endpoint configured correctly
- Issuing events selected in Stripe dashboard
- Webhook signing secret matches Supabase secret
**Fix:** Reconfigure webhook in Stripe, verify with `stripe trigger` test.

---

## Performance Benchmarks

**Target Metrics:**
- Authorization decision latency: < 500ms (p95)
- Webhook processing time: < 1s (p99)
- Database query time: < 50ms (wallet lookup + reserve)

**Load Test (simulate):**
```bash
# Test concurrent authorizations
for i in {1..10}; do
  curl -X POST [webhook-url] -d @test-auth-event.json &
done
wait
```

---

## Emergency Contacts

**On-Call:** Torrance Stroman (CEO)  
**Email:** tstroman.ceo@cravenusa.com  
**Escalation:** Review WALLET_ISSUING_IMPLEMENTATION.md for troubleshooting

---

## Next Steps After Deployment

1. Monitor authorization approval rates (target > 95%)
2. Review wallet ledger for anomalies daily for first week
3. Gather driver feedback on card experience
4. Plan Phase 2: spending limits and notifications
5. Optimize RPC function performance based on actual load

---

**Deployment Completed:** ____________  
**Deployed By:** ____________  
**Production Verified:** ____________





