# Add Backend Environment Variables - REQUIRED

## Current Status
✓ Stripe package installed  
✓ Dotenv package installed  
✓ Server code updated to load .env  
✗ **Missing critical environment variables**

## Variables Needed

Add these to your **root `.env`** file:

```env
# Backend-specific Supabase (service role for admin operations)
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key_here>

# Stripe (for payment processing)
STRIPE_SECRET_KEY=<your_stripe_secret_key_here>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret_here>

# Optional: Backend port (defaults to 3001)
PORT=3001
```

### Where to Find These Values

#### 1. Supabase Service Role Key
1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/settings/api
2. Under "Project API keys" → find **`service_role` key** (secret)
3. Copy and paste into `.env` as `SUPABASE_SERVICE_ROLE_KEY=...`

⚠️ **Never commit this to Git** - it has admin access to your database

#### 2. Stripe Secret Key
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy the **Secret key** (starts with `sk_test_...` or `sk_live_...`)
3. Paste into `.env` as `STRIPE_SECRET_KEY=...`

#### 3. Stripe Webhook Secret
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint or create one for `http://localhost:3001/api/support/webhook`
3. Click to reveal the **Signing secret** (starts with `whsec_...`)
4. Paste into `.env` as `STRIPE_WEBHOOK_SECRET=...`

---

## After Adding Variables

### 1. Verify Setup
```bash
npm run dev:server
```

Should see:
```
Server listening on :3001
```

(No "supabaseUrl is required" or other errors)

### 2. Test Backend
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"ok":true}
```

### 3. Test Full Stack
1. Start both servers: `npm run dev:all`
2. Navigate to: http://localhost:8080/access
3. Enter:
   - Access code: `CRV-SVPP-SVLS-SB3U`
   - Email: `hr@cravenusa.com`
4. Click "Continue"
5. Should redirect to `/allocate` (no 500 error)

---

## Current `.env` Structure

Your `.env` currently has:
- `VITE_SUPABASE_URL` ✓
- `VITE_SUPABASE_ANON_KEY` ✓
- **Missing**: `SUPABASE_SERVICE_ROLE_KEY` ✗
- **Missing**: `STRIPE_SECRET_KEY` ✗
- **Missing**: `STRIPE_WEBHOOK_SECRET` ✗

The `VITE_` prefixed vars are for the frontend only. The backend needs its own set.

---

## Security Notes

- ✓ `.env` is already in `.gitignore`
- ✗ Do NOT share service role key publicly
- ✗ Do NOT commit service role key to Git
- ✓ Use test mode Stripe keys for development
- ✓ Switch to live keys only in production

---

## Next Steps

1. Add the 3 required variables to `.env`
2. Stop the server: `Ctrl+C` in terminal 11
3. Restart: `npm run dev:server`
4. Test: `curl http://localhost:3001/health`
5. Try the access code flow again

---

## Troubleshooting

**Server won't start?**
```bash
# Check what's loaded
npx tsx server/test-env.ts
```

Should show:
- SUPABASE_SERVICE_ROLE_KEY: ✓ Set
- STRIPE_SECRET_KEY: ✓ Set

**Still getting errors?**
Check terminal 11 for specific error messages:
```bash
Get-Content c:\Users\poshl\.cursor\projects\d-Repositories-craven-delivery\terminals\11.txt
```








