# Foundational Support Process - Secrets Configuration

## Required Environment Variables

The support process requires the following secrets to be configured:

### 1. Server-Side Environment Variables (Express Server)

These are loaded by the Express server (`server/index.ts`) and must be set as environment variables.

#### For Local Development (.env file)

Create a `.env` file in the project root:

```bash
# Supabase
SUPABASE_URL=https://xaxbucnjlrfkccsfiddq.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
ORIGIN=http://localhost:8080
PORT=3001
```

#### For Production Deployment

Set these in your hosting platform's environment variables:

**Vercel/Netlify/Railway/etc:**
- Go to your project settings
- Navigate to Environment Variables
- Add each variable listed above

**Docker/Server Deployment:**
- Set in your `.env` file or system environment
- Or use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

---

### 2. Where to Find Each Secret

#### SUPABASE_SERVICE_ROLE_KEY
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Under "Project API keys", copy the **`service_role`** key (⚠️ Keep this secret!)
5. This key bypasses Row Level Security (RLS) - use only server-side

#### STRIPE_SECRET_KEY
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_live_` for production or `sk_test_` for testing)
3. ⚠️ Never expose this in client-side code

#### STRIPE_WEBHOOK_SECRET
1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint** (or edit existing)
3. Set endpoint URL: `https://cravenusa.com/api/support/webhook`
4. Select events: `checkout.session.completed`
5. After saving, click on the webhook endpoint
6. Copy the **Signing secret** (starts with `whsec_`)

#### ORIGIN
- **Local:** `http://localhost:8080`
- **Production:** `https://cravenusa.com`

---

### 3. Verification

#### Test Server Environment Variables

```bash
# Check if variables are loaded (in your server code)
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
```

#### Test API Endpoints

```bash
# Test invite creation (requires admin auth)
curl -X POST http://localhost:3001/api/hub/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","fullName":"Test User"}'

# Test access verification
curl -X POST http://localhost:3001/api/support/verify-access \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"CRV-XXXX-XXXX-XXXX","email":"test@example.com"}'
```

---

### 4. Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use different keys for dev/staging/production**
3. **Rotate secrets regularly**
4. **Limit service role key access** - Only use server-side
5. **Monitor Stripe webhook logs** for suspicious activity

---

### 5. Troubleshooting

#### "SUPABASE_SERVICE_ROLE_KEY is required" error
- Ensure `.env` file exists in project root
- Restart your dev server after adding variables
- Check variable name spelling (case-sensitive)

#### Stripe webhook not working
- Verify webhook URL is correct: `https://cravenusa.com/api/support/webhook`
- Check webhook secret matches in Stripe dashboard
- Ensure raw body parsing is configured (already done in `server/index.ts`)

#### "Unable to create checkout session"
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check Stripe account is in live mode (not test mode) if using live keys
- Verify Stripe API version compatibility

---

### 6. Environment-Specific Configuration

#### Development
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
ORIGIN=http://localhost:8080
```

#### Production
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
ORIGIN=https://cravenusa.com
```

---

## Quick Setup Checklist

- [ ] Create `.env` file in project root
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add `STRIPE_SECRET_KEY`
- [ ] Add `STRIPE_WEBHOOK_SECRET`
- [ ] Add `ORIGIN` (or use default)
- [ ] Configure Stripe webhook endpoint
- [ ] Test invite creation
- [ ] Test checkout flow
- [ ] Verify webhook receives events

