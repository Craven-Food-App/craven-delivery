# Development Console Warnings Guide

## Overview

This document explains common console warnings/errors you may see during development and how to address them.

## 1. WebSocket Connection Error (HMR)

**Error:**
```
WebSocket connection to 'ws://localhost:8080/?token=...' failed
[vite] failed to connect to websocket
```

**Cause:** Vite's Hot Module Replacement (HMR) WebSocket connection issue.

**Solutions:**
1. **Restart the dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   cd apps/customer
   npm run dev
   ```

2. **Clear browser cache and reload:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

3. **Check if port 8080 is available:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :8080
   ```

4. **If issue persists:** The HMR config has been updated in `vite.config.ts` to use `0.0.0.0` host which should resolve most connection issues.

**Note:** This is a development-only issue and doesn't affect production builds.

---

## 2. Stripe Publishable Key Warning

**Warning:**
```
VITE_STRIPE_PUBLISHABLE_KEY is not set - Stripe payment methods will not be available
```

**Cause:** Stripe environment variable is not configured.

**Solution:**
1. Create `.env` file in `apps/customer/`:
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
   ```

2. Get your Stripe key:
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your **Publishable key** (starts with `pk_live_` or `pk_test_`)

3. Restart the dev server after adding the key.

**Note:** 
- This is expected if you haven't set up Stripe yet
- Payment functionality will not work without this key
- See `SETUP.md` for detailed instructions

---

## 3. Geolocation Access Denied

**Error:**
```
Location access denied or unavailable: GeolocationPositionError
```

**Cause:** Browser/device has denied location permission or geolocation is unavailable.

**Solutions:**
1. **Grant location permission:**
   - Click the location icon in your browser's address bar
   - Select "Allow" for location access
   - Refresh the page

2. **Check browser settings:**
   - Chrome: Settings → Privacy and security → Site settings → Location
   - Firefox: Settings → Privacy & Security → Permissions → Location

3. **For development/testing:**
   - The app will gracefully fall back to default location or manual address entry
   - This error is logged but doesn't break the app

**Note:**
- In production (native app), location permission is requested via Capacitor
- The app handles this error gracefully and continues to function

---

## 4. Supabase Auth Token Error

**Error:**
```
Failed to load resource: the server responded with a status of 400
/auth/v1/token?grant_type=refresh_token
```

**Cause:** Invalid or expired refresh token.

**Solutions:**
1. **Clear browser storage:**
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   // Then refresh the page
   ```

2. **Log out and log back in:**
   - Navigate to `/auth`
   - Log out if logged in
   - Log back in with valid credentials

3. **Check Supabase configuration:**
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
   - Check if Supabase project is active and accessible

**Note:**
- This is usually a session/authentication issue
- The app should redirect to login if authentication fails
- Check network tab for more details on the 400 error

---

## 5. React DevTools Message

**Message:**
```
Download the React DevTools for a better development experience
```

**Info:** This is just an informational message, not an error.

**Solution (Optional):**
- Install React DevTools browser extension:
  - Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
  - Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

---

## Summary

| Issue | Severity | Action Required |
|-------|----------|----------------|
| WebSocket HMR | Low | Restart dev server if needed |
| Stripe Key | Medium | Set env variable for payment features |
| Geolocation | Low | Grant permission or use fallback |
| Supabase Auth | Medium | Clear storage and re-authenticate |
| React DevTools | None | Optional installation |

## Quick Fixes

**For a clean development environment:**
```bash
# 1. Stop dev server
# 2. Clear browser cache and storage
# 3. Restart dev server
cd apps/customer
npm run dev

# 4. If Stripe needed, create .env file
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" > .env
```

Most of these warnings are expected during development and don't affect production builds.






