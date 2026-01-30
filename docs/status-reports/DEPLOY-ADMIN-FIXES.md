# 🚀 Deploy Admin Backend Fixes

## ✅ What Was Fixed

1. **RLS Security Policies** - Replaced `USING(true)` with proper `is_admin()` checks
2. **Missing Edge Functions** - Created `process-refund` and `send-notification` functions
3. **Security Gap** - Admin operations tables now properly protected

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

Run the RLS fix migration in Supabase SQL Editor:

**File:** `supabase/migrations/20250120000000_fix_admin_operations_rls.sql`

```bash
# Either:
# 1. Copy the file contents and paste into Supabase SQL Editor
# 2. Or if you have Supabase CLI:
supabase db push
```

### Step 2: Deploy Edge Functions

Deploy the new admin edge functions:

```bash
# Deploy process-refund function
supabase functions deploy process-refund

# Deploy send-notification function  
supabase functions deploy send-notification
```

### Step 3: Configure Environment Variables

Add to your Supabase Edge Functions environment:

```bash
# Get your keys from Supabase Dashboard → Settings → API
supabase secrets set RESEND_API_KEY=your_resend_api_key
# supabase secrets set STRIPE_SECRET_KEY=your_stripe_key  # When ready for production
```

### Step 4: Verify Migration Ran

Check that policies were updated:

```sql
-- In Supabase SQL Editor
SELECT policyname, qual 
FROM pg_policies 
WHERE tablename IN ('refund_requests', 'disputes', 'support_tickets', 'admin_audit_logs')
ORDER BY tablename, policyname;
```

Should show `public.is_admin(auth.uid())` not `true`.

---

## 🔧 What Changed

### Before (INSECURE)
```sql
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  USING (true);  -- ❌ ANY authenticated user can access!
```

### After (SECURE)
```sql
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  USING (public.is_admin(auth.uid()));  -- ✅ Only admins!
```

---

## 🧪 Testing

### Test 1: Verify Admin Access Works

1. Login as admin user
2. Navigate to `/admin`
3. Check each operations tab loads:
   - ✅ Refunds
   - ✅ Disputes  
   - ✅ Support Tickets
   - ✅ Audit Logs

### Test 2: Verify Non-Admin Access Blocked

1. Login as regular user (NOT in user_roles as admin)
2. Try to access `/admin`
3. Should see "Admin Access Required" message

### Test 3: Verify Edge Functions Work

Test from admin portal:
1. Create a test refund request
2. Try to process it
3. Should call `process-refund` function successfully

---

## ⚠️ Known Issues & TODOs

### 1. Payment Integration Needed

The `process-refund` function currently simulates refunds. To go live:

```typescript
// In supabase/functions/process-refund/index.ts
// Uncomment and configure Stripe integration
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' });

const refund = await stripe.refunds.create({
  payment_intent: order.payment_intent_id,
  amount: amountCents,
});
```

### 2. FIX_INFINITE_RECURSION.sql Conflict

**Issue:** `FIX_INFINITE_RECURSION.sql` uses wrong table (`user_profiles` instead of `user_roles`)

**Action:** This file is deprecated - new migration uses correct `user_roles` table.

### 3. Email Notifications

The `send-notification` function works but needs:
- `RESEND_API_KEY` environment variable
- Verified domain in Resend
- Email templates designed

---

## 📊 Impact Summary

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| **RLS Policies** | `USING(true)` - anyone authenticated | `is_admin(auth.uid())` - admins only | ✅ Fixed |
| **Refund Processing** | Frontend calls missing function | Edge function exists | ✅ Created |
| **Email Notifications** | Missing function | Edge function exists | ✅ Created |
| **Security** | 🔴 Critical gap | 🟢 Protected | ✅ Secure |

---

## 🚨 Rollback Plan

If something breaks after deployment:

### Rollback RLS Changes

```sql
-- Restore permissive policies (NOT RECOMMENDED)
DROP POLICY IF EXISTS "Admins can view all refund requests" ON refund_requests;
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  TO authenticated
  USING (true);
-- Repeat for all affected tables
```

### Rollback Edge Functions

```bash
# Delete the functions
supabase functions delete process-refund
supabase functions delete send-notification
```

---

## ✅ Success Criteria

- [ ] Database migration ran without errors
- [ ] Edge functions deployed successfully
- [ ] Admin users can access all operations tabs
- [ ] Non-admin users are blocked from admin portal
- [ ] No console errors in browser
- [ ] Environment variables configured

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Edge Functions
2. Check browser console for errors
3. Verify your user has admin role: `SELECT * FROM user_roles WHERE role = 'admin';`
4. Review this migration file for policy details

---

**Deployment Status:** Ready to deploy ✅  
**Security Status:** Fixed 🔒  
**Production Ready:** Yes (after payment integration)

