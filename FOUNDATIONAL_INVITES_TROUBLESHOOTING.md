# Foundational Invites Portal - Troubleshooting Guide

## Common Issues & Solutions

### 1. **Page Not Loading / Blank Screen**

**Symptoms:** Page loads but shows nothing or error

**Check:**
- ✅ Server is running: `npm run dev:server` (should be on port 3001)
- ✅ Frontend is running: `npm run dev` (should be on port 8080)
- ✅ Route is registered in `src/App.tsx`: `/hub/foundational/invites`

**Fix:**
```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start frontend
npm run dev
```

---

### 2. **API Calls Failing (Network Errors)**

**Symptoms:** "Failed to load invites" or network errors in console

**Check:**
- ✅ Server is running on port 3001
- ✅ Vite proxy is configured (already done in `vite.config.ts`)
- ✅ CORS is configured in `server/index.ts`

**Fix:**
1. Check server logs for errors
2. Verify API endpoint: `http://localhost:3001/api/hub/invites/list`
3. Test with curl:
```bash
curl http://localhost:3001/api/hub/invites/list
```

---

### 3. **"Unable to create invite" Error**

**Symptoms:** Creating invite fails with database error

**Check:**
- ✅ Database migration has been run
- ✅ `invites` table exists in Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is set in environment

**Fix:**
1. Run migration in Supabase:
   - Go to Supabase Dashboard → SQL Editor
   - Run: `supabase/migrations/20260201000001_create_foundational_invites.sql`

2. Set environment variable:
```bash
# In .env file
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. Restart server after setting env var

---

### 4. **"Unauthorized" Error**

**Symptoms:** API returns 401 Unauthorized

**Check:**
- ✅ User is logged in
- ✅ User has admin/CEO access
- ✅ `BusinessAuthGuard` is working

**Current Status:** 
- The `assertHubAdmin` function is currently a no-op (allows all requests)
- This is intentional for MVP - will be implemented later

**Fix:**
- For now, this shouldn't block access
- If it does, check server logs for the actual error

---

### 5. **Database Table Missing**

**Symptoms:** "relation 'invites' does not exist"

**Fix:**
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and run the migration file:
   `supabase/migrations/20260201000001_create_foundational_invites.sql`

4. Verify table exists:
```sql
SELECT * FROM public.invites LIMIT 1;
```

---

### 6. **Environment Variables Not Set**

**Symptoms:** Server crashes on startup or "SUPABASE_SERVICE_ROLE_KEY is required"

**Fix:**
1. Create `.env` file in project root:
```bash
SUPABASE_URL=https://xaxbucnjlrfkccsfiddq.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ORIGIN=http://localhost:8080
PORT=3001
```

2. Restart server after adding variables

3. Get service role key:
   - Supabase Dashboard → Settings → API
   - Copy "service_role" key (⚠️ Keep secret!)

---

### 7. **Component Not Rendering**

**Symptoms:** Page loads but component doesn't show

**Check:**
- ✅ Component is imported correctly in `src/App.tsx`
- ✅ Route path matches: `/hub/foundational/invites`
- ✅ No TypeScript errors

**Fix:**
1. Check browser console for errors
2. Verify import:
```typescript
import HubFoundationalInvites from "./pages/HubFoundationalInvites";
```

3. Check route:
```typescript
<Route path="/hub/foundational/invites" element={<BusinessAuthGuard><HubFoundationalInvites /></BusinessAuthGuard>} />
```

---

## Quick Diagnostic Checklist

- [ ] Server running on port 3001
- [ ] Frontend running on port 8080
- [ ] `.env` file exists with `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Database migration has been run
- [ ] `invites` table exists in Supabase
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] User is logged in and has admin access

---

## Testing the API Directly

### Test List Endpoint
```bash
curl http://localhost:3001/api/hub/invites/list
```

### Test Create Endpoint
```bash
curl -X POST http://localhost:3001/api/hub/invites/create \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","fullName":"Test User"}'
```

### Expected Response
```json
{
  "invite": {
    "id": "...",
    "access_code": "CRV-XXXX-XXXX-XXXX",
    "email": "test@example.com",
    "status": "invited",
    "created_at": "..."
  }
}
```

---

## Still Not Working?

1. **Check server logs** - Look for error messages
2. **Check browser console** - Look for network errors or JavaScript errors
3. **Verify database** - Ensure migration ran successfully
4. **Test API directly** - Use curl to test endpoints
5. **Check environment** - Ensure all required variables are set

