# Chat Bot Troubleshooting Guide

## Issue: Bot responses work in dev but not in production (Android app/web)

## Root Causes & Solutions

### 1. **Missing OPENAI_API_KEY in Supabase Production** ⚠️ MOST LIKELY

**Problem**: The `OPENAI_API_KEY` environment variable is not set in your Supabase production project.

**Solution**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your production project
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Add or verify `OPENAI_API_KEY` is set with your OpenAI API key
5. If missing, click **Add Secret** and enter:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)

**Verify**:
- Check Supabase logs: **Logs** → **Edge Functions** → `ai-chat-support`
- Look for error: `OPENAI_API_KEY is not set`

---

### 2. **CORS Configuration** ✅ FIXED

**Problem**: Android app origins were not in the allowed CORS list.

**Solution**: ✅ Already fixed - Added mobile app origins:
- `capacitor://localhost`
- `ionic://localhost`
- `http://localhost`
- `https://localhost`

**Verify**: Check browser/device console for CORS errors.

---

### 3. **Network/Connectivity Issues**

**Problem**: Production builds might have different network configurations.

**Check**:
1. Verify Supabase URL is correct in production build
2. Check if edge functions are accessible:
   ```bash
   curl -X POST https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/ai-chat-support \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"message":"test","conversationId":"test","userId":"test"}'
   ```

---

### 4. **Authentication Issues**

**Problem**: Edge function might require authentication that works differently in production.

**Check**:
- Verify user is authenticated before calling the function
- Check Supabase logs for authentication errors
- Ensure `SUPABASE_ANON_KEY` is correctly set in production build

---

## Debugging Steps

### Step 1: Check Supabase Logs
1. Go to Supabase Dashboard → **Logs** → **Edge Functions**
2. Select `ai-chat-support` function
3. Look for errors when sending a message
4. Common errors:
   - `OPENAI_API_KEY is not set` → Set the secret (see #1 above)
   - `CORS error` → Already fixed, but verify origin is allowed
   - `Authentication error` → Check user auth status

### Step 2: Check Client Console
1. Open browser/device developer tools
2. Look for console errors when sending a message
3. Check Network tab for failed requests to `ai-chat-support`
4. Look for:
   - `AI function error:` - Shows the actual error
   - `Error details:` - Shows error context

### Step 3: Test Edge Function Directly
```bash
# Test from command line
curl -X POST https://xaxbucnjlrfkccsfiddq.supabase.co/functions/v1/ai-chat-support \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "conversationId": "test-conv-id",
    "userId": "test-user-id"
  }'
```

---

## Code Changes Made

### 1. Enhanced Error Handling
- ✅ Added check for missing `OPENAI_API_KEY` before processing
- ✅ Better error messages returned to client
- ✅ Detailed console logging for debugging

### 2. Improved CORS
- ✅ Added mobile app origins to allowed list
- ✅ Better origin detection (checks `referer` header)

### 3. Better Client-Side Logging
- ✅ More detailed error logging in `ChatInterface.tsx`
- ✅ Shows error context and status codes
- ✅ User-friendly fallback messages

---

## Quick Fix Checklist

- [ ] **Set OPENAI_API_KEY in Supabase production** (Settings → Edge Functions → Secrets)
- [ ] **Verify edge function is deployed** (Supabase Dashboard → Edge Functions)
- [ ] **Check Supabase logs** for errors
- [ ] **Test in browser console** - look for error messages
- [ ] **Verify user authentication** - ensure user is logged in
- [ ] **Check network requests** - ensure function is being called
- [ ] **Rebuild app** after setting environment variables

---

## Environment Variables Required

### Supabase Edge Function Secrets (Set in Supabase Dashboard)
```
OPENAI_API_KEY=sk-... (Your OpenAI API key)
SUPABASE_URL=https://xaxbucnjlrfkccsfiddq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=... (Auto-set by Supabase)
```

### Client App Environment Variables
```
VITE_SUPABASE_URL=https://xaxbucnjlrfkccsfiddq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (Your anon key)
```

---

## Still Not Working?

1. **Check Supabase Function Logs** - Most errors will appear here
2. **Check Browser/Device Console** - Client-side errors
3. **Verify API Key is Valid** - Test with OpenAI directly
4. **Check Function Deployment** - Ensure latest code is deployed
5. **Test with curl** - Verify function works independently

---

## Contact Support

If issues persist:
1. Share Supabase function logs
2. Share browser/device console errors
3. Share network request details
4. Verify all environment variables are set correctly





