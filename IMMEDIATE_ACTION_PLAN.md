# 🚨 **IMMEDIATE ACTION PLAN - GET TO 100% READY**

**Created:** December 20, 2025  
**Goal:** Fix ALL blockers and be 100% production ready  
**Timeline:** 6-12 hours of focused work

---

## 🎯 **MISSION: ELIMINATE ALL BLOCKERS**

We're going to systematically fix every single blocker. No shortcuts, no "good enough" - we're going to 100%.

---

## 📋 **PHASE 1: PAYMENT VERIFICATION (4-6 hours)**

### **Step 1: Verify Stripe Keys Configuration** ⏱️ 30 minutes

**Check Supabase Secrets:**
1. Go to Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions → Secrets
3. Verify these secrets exist:

```bash
✅ STRIPE_SECRET_KEY=sk_live_...  # Must start with sk_live_ (NOT sk_test_)
✅ STRIPE_WEBHOOK_SECRET=whsec_... # For webhook signature verification
✅ SUPABASE_URL=https://...
✅ SUPABASE_SERVICE_ROLE_KEY=...
✅ SUPABASE_ANON_KEY=...
✅ RESEND_API_KEY=re_...
✅ MAPBOX_ACCESS_TOKEN=pk...
```

**NEW - Must Add:**
```bash
ALLOWED_ORIGINS=https://cravenusa.com,https://www.cravenusa.com,https://feeder.cravenusa.com,http://localhost:8080
```

**Check Frontend .env:**
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Must be pk_live_ (NOT pk_test_)
VITE_MAPBOX_TOKEN=pk...
```

**Action Items:**
- [ ] Screenshot Supabase secrets (redact sensitive parts)
- [ ] Verify all keys are PRODUCTION keys (not test)
- [ ] Add ALLOWED_ORIGINS if missing
- [ ] Update frontend .env if needed

---

### **Step 2: Test Payment Flow End-to-End** ⏱️ 2-3 hours

#### **Test 1: Customer Payment** (30 min)
1. **Setup:**
   - Use a real test card: `4242 4242 4242 4242` (Stripe test mode)
   - OR use real card if in production mode

2. **Test Flow:**
   ```
   Browse Restaurants → Add to Cart → Checkout → Enter Payment → Place Order
   ```

3. **Verify:**
   - [ ] Payment intent created in Stripe dashboard
   - [ ] Order created in `orders` table
   - [ ] Payment status = 'paid'
   - [ ] Customer receives confirmation
   - [ ] Restaurant receives order notification

4. **Check Logs:**
   ```bash
   # In Supabase Dashboard → Edge Functions → Logs
   # Look for create-payment function
   ```

**If Fails:**
- Check browser console for errors
- Check Edge Function logs
- Verify STRIPE_SECRET_KEY is set correctly

---

#### **Test 2: Driver Payout** (45 min)
1. **Setup:**
   - Need a driver with completed deliveries
   - Driver must have Stripe Connect account

2. **Test Flow:**
   ```
   Driver App → Earnings → Instant Cashout → Confirm
   ```

3. **Verify:**
   - [ ] Payout created in Stripe dashboard
   - [ ] Balance deducted from driver earnings
   - [ ] Payout status tracked in database
   - [ ] Driver receives confirmation

4. **Edge Functions to Check:**
   - `manual-driver-payout`
   - `daily-driver-payouts`

**If Fails:**
- Check if driver has Stripe Connect account
- Verify STRIPE_SECRET_KEY has Connect permissions
- Check Edge Function logs

---

#### **Test 3: Restaurant Payout** (45 min)
1. **Setup:**
   - Restaurant with completed orders
   - Restaurant must have Stripe Connect account

2. **Test Flow:**
   ```
   Calculate commission → Schedule payout → Execute payout
   ```

3. **Verify:**
   - [ ] Commission calculated correctly
   - [ ] Payout created in Stripe
   - [ ] Restaurant balance updated
   - [ ] Payout record in database

**If Fails:**
- Check commission calculation logic
- Verify restaurant Stripe Connect setup
- Check payout scheduling

---

#### **Test 4: Refund Flow** (30 min)
1. **Test Flow:**
   ```
   Admin Portal → Orders → Select Order → Issue Refund
   ```

2. **Verify:**
   - [ ] Refund created in Stripe
   - [ ] Order status updated
   - [ ] Customer notified
   - [ ] Refund appears in Stripe dashboard

3. **Edge Function:** `process-refund`

---

#### **Test 5: Webhook Verification** (30 min)
1. **Setup Webhook in Stripe:**
   ```
   Stripe Dashboard → Developers → Webhooks → Add Endpoint
   URL: https://[your-project].supabase.co/functions/v1/stripe-webhook
   Events: payment_intent.succeeded, payment_intent.failed, etc.
   ```

2. **Get Webhook Secret:**
   ```
   Copy the webhook signing secret (whsec_...)
   Add to Supabase secrets as STRIPE_WEBHOOK_SECRET
   ```

3. **Test:**
   - Trigger a test event in Stripe dashboard
   - Check Edge Function logs for webhook receipt
   - Verify webhook signature validation works

4. **Verify Events:**
   - [ ] `payment_intent.succeeded`
   - [ ] `payment_intent.failed`
   - [ ] `charge.refunded`
   - [ ] `payout.paid`

---

### **Step 3: Load Test Payment System** ⏱️ 1 hour

**Create Simple Load Test Script:**

```typescript
// test-payments.ts
const testPayments = async (count: number) => {
  const results = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch('https://[your-project].supabase.co/functions/v1/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer [your-token]'
        },
        body: JSON.stringify({
          orderTotal: 2500,
          customerInfo: {
            email: `test${i}@example.com`,
            name: `Test User ${i}`
          },
          orderId: `test-order-${i}`
        })
      });
      
      results.push({ success: response.ok, status: response.status });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
};

// Test with 10 concurrent payments
testPayments(10).then(console.log);
```

**Run Test:**
```bash
deno run --allow-net test-payments.ts
```

**Verify:**
- [ ] All payments succeed
- [ ] Rate limiting works (should block after 3 in 1 minute)
- [ ] No errors in logs
- [ ] Response times < 2 seconds

---

## 📋 **PHASE 2: PRODUCTION POLISH (2-4 hours)**

### **Step 4: Environment Variables Audit** ⏱️ 30 minutes

**Create Environment Check Script:**

```typescript
// check-env.ts
const requiredSupabaseSecrets = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'RESEND_API_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'ALLOWED_ORIGINS'
];

const requiredFrontendEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_MAPBOX_TOKEN'
];

console.log('Checking Supabase Secrets...');
// Manual check in Supabase dashboard

console.log('Checking Frontend .env...');
requiredFrontendEnv.forEach(key => {
  const value = import.meta.env[key];
  console.log(`${key}: ${value ? '✅ Set' : '❌ Missing'}`);
});
```

**Action Items:**
- [ ] Run environment check
- [ ] Fix any missing variables
- [ ] Verify production keys (not test)
- [ ] Document all environment variables

---

### **Step 5: SSL/TLS & Domain Configuration** ⏱️ 30 minutes

**Verify SSL:**
1. Check https://cravenusa.com loads with valid SSL
2. Check https://www.cravenusa.com redirects correctly
3. Check https://feeder.cravenusa.com (if applicable)

**DNS Configuration:**
```
cravenusa.com        → A record → Vercel/Netlify IP
www.cravenusa.com    → CNAME  → cravenusa.com
feeder.cravenusa.com → CNAME  → cravenusa.com (or separate)
```

**Action Items:**
- [ ] Verify SSL certificates valid
- [ ] Check DNS propagation
- [ ] Test all subdomains
- [ ] Verify HTTPS redirect works

---

### **Step 6: Security Headers** ⏱️ 30 minutes

**Add Security Headers to vercel.json:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(self)"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.mapbox.com wss://*.supabase.co; frame-src https://js.stripe.com;"
        }
      ]
    }
  ]
}
```

**Action Items:**
- [ ] Create/update vercel.json
- [ ] Deploy and verify headers
- [ ] Test with securityheaders.com
- [ ] Fix any CSP violations

---

### **Step 7: Error Tracking & Monitoring** ⏱️ 1 hour

**Setup Sentry (if not already):**

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Setup Uptime Monitoring:**
1. Sign up for UptimeRobot (free tier)
2. Add monitors:
   - https://cravenusa.com (check every 5 min)
   - https://[project].supabase.co/functions/v1/health (if you create one)
3. Set up email/SMS alerts

**Action Items:**
- [ ] Verify Sentry is capturing errors
- [ ] Set up uptime monitoring
- [ ] Configure alert channels
- [ ] Test alert delivery

---

### **Step 8: Legal Pages** ⏱️ 1 hour

**Required Pages:**
1. Terms of Service
2. Privacy Policy
3. Cookie Policy (if using cookies)
4. Refund Policy

**Quick Solution:**
- Use Termly.io or TermsFeed to generate
- Customize for your business
- Add to footer links

**Action Items:**
- [ ] Create/update Terms of Service
- [ ] Create/update Privacy Policy
- [ ] Add links to footer
- [ ] Verify pages are accessible

---

### **Step 9: Database Backup Verification** ⏱️ 30 minutes

**Verify Supabase Backups:**
1. Go to Supabase Dashboard → Settings → Backups
2. Verify daily backups are enabled
3. Test restore process (optional but recommended)

**Create Manual Backup:**
```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Or use pg_dump directly
pg_dump [connection-string] > backup.sql
```

**Action Items:**
- [ ] Verify automatic backups enabled
- [ ] Create manual backup
- [ ] Store backup securely (S3, Google Drive, etc.)
- [ ] Document restore procedure

---

### **Step 10: Performance Optimization** ⏱️ 1 hour

**Run Lighthouse Audit:**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://cravenusa.com --output html --output-path ./lighthouse-report.html
```

**Target Scores:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

**Quick Wins:**
1. **Image Optimization:**
   - Convert images to WebP
   - Add lazy loading
   - Use appropriate sizes

2. **Code Splitting:**
   - Already done with React.lazy
   - Verify chunks are loading correctly

3. **Caching:**
   - Add cache headers for static assets
   - Use service worker for offline support

**Action Items:**
- [ ] Run Lighthouse audit
- [ ] Fix critical issues (score < 50)
- [ ] Implement quick wins
- [ ] Re-run audit to verify improvements

---

## 📋 **PHASE 3: FINAL VERIFICATION (1-2 hours)**

### **Step 11: Critical User Flows** ⏱️ 1 hour

**Test Each Flow:**

1. **Customer Journey:**
   ```
   ✅ Sign up
   ✅ Browse restaurants
   ✅ Add items to cart
   ✅ Checkout with payment
   ✅ Track order
   ✅ Receive order
   ✅ Rate order
   ```

2. **Driver Journey:**
   ```
   ✅ Sign up
   ✅ Complete onboarding
   ✅ Go online
   ✅ Accept order
   ✅ Pick up order
   ✅ Deliver order
   ✅ Instant cashout
   ```

3. **Restaurant Journey:**
   ```
   ✅ Sign up
   ✅ Set up menu
   ✅ Receive order
   ✅ Mark order ready
   ✅ Complete order
   ✅ View earnings
   ```

4. **Admin Journey:**
   ```
   ✅ View dashboard
   ✅ Manage orders
   ✅ Process refund
   ✅ Handle dispute
   ✅ View analytics
   ```

---

### **Step 12: Load Testing** ⏱️ 30 minutes

**Simple Load Test:**
```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Create test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  let res = http.get('https://cravenusa.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
EOF

# Run test
k6 run load-test.js
```

**Verify:**
- [ ] All requests succeed
- [ ] Response times acceptable
- [ ] No errors in logs
- [ ] Database handles load

---

### **Step 13: Security Scan** ⏱️ 30 minutes

**Run Security Checks:**

1. **OWASP ZAP Scan:**
   ```bash
   # Quick scan
   docker run -t owasp/zap2docker-stable zap-baseline.py -t https://cravenusa.com
   ```

2. **Check Security Headers:**
   ```bash
   curl -I https://cravenusa.com
   # Verify security headers present
   ```

3. **SSL Test:**
   - Go to https://www.ssllabs.com/ssltest/
   - Enter cravenusa.com
   - Target: A+ rating

**Action Items:**
- [ ] Run security scan
- [ ] Fix critical vulnerabilities
- [ ] Verify SSL rating
- [ ] Document findings

---

## ✅ **FINAL CHECKLIST**

### **Before Launch:**
- [ ] All payment tests pass
- [ ] Environment variables verified
- [ ] SSL/TLS configured
- [ ] Security headers added
- [ ] Monitoring configured
- [ ] Legal pages published
- [ ] Backups verified
- [ ] Performance optimized
- [ ] Critical flows tested
- [ ] Load testing passed
- [ ] Security scan passed

### **Launch Day:**
- [ ] Deploy latest code
- [ ] Verify all Edge Functions deployed
- [ ] Test production environment
- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Verify webhooks working
- [ ] Monitor performance
- [ ] Be ready for hotfixes

---

## 🎯 **TIMELINE**

**Day 1 (Today):**
- Phase 1: Payment Verification (4-6 hours)
- Phase 2: Production Polish (2-4 hours)

**Day 2 (Tomorrow):**
- Phase 3: Final Verification (1-2 hours)
- Deploy to production
- Monitor closely

**Total Time:** 8-12 hours of focused work

---

## 🚀 **YOU'VE GOT THIS!**

This plan eliminates ALL blockers. Follow it step by step, and you'll be 100% production ready.

**No shortcuts. No "good enough". 100% ready.**

Let's do this! 💪

