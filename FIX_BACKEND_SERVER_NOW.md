# Fix Backend Server - Required Actions

## Issues Identified

1. **Missing Stripe package** → Server can't import dependencies
2. **Missing environment variables** → Server can't connect to Supabase
3. **Multiple dev servers running** → Port conflicts

---

## Steps to Fix

### 1. Stop All Running Servers

In PowerShell:
```powershell
# Kill processes on ports 8080, 8081, 3001
Get-NetTCPConnection -LocalPort 8080,8081,3001 -ErrorAction SilentlyContinue | 
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### 2. Verify Stripe is Installed

```bash
npm list stripe
```

If not installed:
```bash
npm install stripe
```

### 3. Create Server Environment File

The backend needs a `server/.env` file (or root `.env` with SERVER_ prefix).

**Option A: Use your existing root `.env`**

Add these to your main `.env` if not already there:
```env
PORT=3001
SUPABASE_URL=https://xaxbucnjlrfkccsfiddq.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_webhook_secret>
SMTP_USER=<your_smtp_user>
SMTP_PASS=<your_smtp_password>
```

**Option B: Create `server/.env`** (copy from `server/.env.example` if it exists, or create it with the above vars)

### 4. Update server/env.ts to load from root .env

If the server can't see root `.env`, update `server/env.ts`:

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3001,
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "documents",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  SMTP_HOST: process.env.SMTP_HOST || "smtp.office365.com",
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || "Crave'n Docs <no-reply@cravenusa.com>",
  ORIGIN: process.env.ORIGIN || "http://localhost:8080"
};
```

### 5. Start Servers Correctly

```bash
# Clean start - both frontend and backend
npm run dev:all
```

Or separately:
```bash
# Terminal 1: Frontend (Vite)
npm run dev

# Terminal 2: Backend (Express)
npm run dev:server
```

### 6. Verify

- Frontend should run on **http://localhost:8080**
- Backend should log: `Server listening on :3001`
- No more ECONNREFUSED errors in Vite proxy logs

---

## Expected Result

After fixing:
1. Navigate to `http://localhost:8080/access`
2. Enter access code: `CRV-SVPP-SVLS-SB3U`
3. Enter email: `hr@cravenusa.com`
4. Click "Continue"
5. Should redirect to `/allocate` page (no 500 error)

---

## Quick Diagnostic

**Is Stripe installed?**
```bash
npm list stripe
```

**Is backend running?**
```bash
curl http://localhost:3001/health
# Should return: {"ok":true}
```

**Are env vars loaded?**
Check server console output for "supabaseUrl is required" error.

---

## Status
- [ ] Stripe package installed
- [ ] Server environment variables configured
- [ ] Old servers stopped
- [ ] `npm run dev:all` running cleanly
- [ ] Backend responding at localhost:3001
- [ ] Access page verification working






