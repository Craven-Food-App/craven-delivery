# 📱 Mobile App Setup Guide

## Fix for White Screen Issue

The mobile app white screen was caused by missing environment variables that were throwing errors on startup. This has been **FIXED** ✅

---

## What Was Changed

### 1. **Non-Blocking Environment Validation**
- Environment validation no longer throws errors that crash the app
- Missing variables are logged as warnings instead
- App continues to load even without all env vars

### 2. **Better Error UI**
- Added graceful error fallback with retry button
- Shows helpful message instead of white screen
- Wrapped mobile app in BrowserRouter for better routing

### 3. **Improved Fallback Messages**
- AccessGuard now shows a beautiful UI when access is denied
- Clear instructions for users
- Professional design with gradients and icons

---

## Environment Variables Required

Create a `.env` file in your project root with these variables:

```env
# REQUIRED for app to function
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here

# OPTIONAL
VITE_DEBUG_MODE=true
VITE_OFFLINE_MODE_ENABLED=true
```

---

## How to Get Your API Keys

### 1. **Supabase** (Required)
```
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings > API
4. Copy "Project URL" → VITE_SUPABASE_URL
5. Copy "anon/public" key → VITE_SUPABASE_ANON_KEY
```

### 2. **Mapbox** (Required)
```
1. Go to https://account.mapbox.com
2. Sign in or create account
3. Navigate to Access Tokens
4. Copy your default public token → VITE_MAPBOX_ACCESS_TOKEN
```

---

## Building the Mobile App

### Step 1: Set Environment Variables
Create `.env` file with your keys (see above)

### Step 2: Build the Web App
```bash
npm run build
```

### Step 3: Sync with Capacitor
```bash
npx cap sync
```

### Step 4: Open in Native IDE
```bash
# For iOS
npx cap open ios

# For Android
npx cap open android
```

### Step 5: Run on Device
- **iOS**: Open in Xcode, select device, click Run
- **Android**: Open in Android Studio, select device, click Run

---

## Troubleshooting White Screen

### If you still see a white screen:

#### 1. **Check Console Logs**

**For iOS:**
```
1. Connect iPhone to Mac
2. Open Safari
3. Develop → [Your iPhone] → Select your app
4. Check Console for errors
```

**For Android:**
```
1. Connect Android device
2. Open Chrome
3. Navigate to chrome://inspect
4. Find your app → Inspect
5. Check Console for errors
```

#### 2. **Verify Environment Variables**
```bash
# In your terminal, run:
cat .env

# Should show your VITE_ variables
```

#### 3. **Clear Build Cache**
```bash
# Clean everything
rm -rf node_modules
rm -rf dist
npm install
npm run build
npx cap sync
```

#### 4. **Check Capacitor Config**
Open `capacitor.config.ts` and verify:
```typescript
const config: CapacitorConfig = {
  appId: 'com.craven.delivery',
  appName: 'Craven Delivery',
  webDir: 'dist',
  // ... rest of config
};
```

#### 5. **Test in Browser First**
```bash
npm run dev

# Open http://localhost:8080
# Verify app works in browser before testing mobile
```

---

## Common Errors & Solutions

### Error: "Missing required environment variables"
**Solution:** Create `.env` file with all required variables

### Error: "Cannot read properties of undefined"
**Solution:** Make sure Supabase URL and key are correct

### Error: White screen with no console errors
**Solution:** Check if AccessGuard is blocking (user needs Feeder access)

### Error: "Capacitor is not defined"
**Solution:** Make sure you're testing on actual mobile device, not browser

---

## Testing the Fix

### 1. **Without Environment Variables** (Should work now!)
```bash
# Temporarily rename .env
mv .env .env.backup

# Build and run
npm run build
npx cap sync
npx cap open ios
```

**Expected Result:**
- App loads (no white screen!)
- Shows error message explaining missing env vars
- "Try Again" and "Go Home" buttons work

### 2. **With Environment Variables** (Full functionality)
```bash
# Restore .env
mv .env.backup .env

# Build and run
npm run build
npx cap sync
npx cap open ios
```

**Expected Result:**
- App loads completely
- All features work
- Maps, data sync, etc. functional

---

## Environment Variables Per Platform

### Development (Local)
Uses `.env` file in project root

### Production (Web)
Set in your hosting provider:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- Lovable: Project Settings → Environment Variables

### Mobile (iOS/Android)
Environment variables are bundled during build:
1. Set `.env` file
2. Run `npm run build` (reads .env)
3. Run `npx cap sync` (copies to mobile)
4. Build in Xcode/Android Studio

---

## File Changes Made

### `src/config/environment.ts`
- Changed `validateEnvironment()` to not throw errors
- Added warnings instead of crashes
- Only blocks in web production, not mobile

### `src/App.tsx`
- Added `BrowserRouter` wrapper for mobile
- Improved AccessGuard fallback UI
- Better error messages

### `src/components/ErrorBoundary.tsx`
- Already had good error UI
- Shows "Try Again" and "Go Home" buttons
- Displays error details in development

---

## Need Help?

1. Check console logs (see Troubleshooting section)
2. Verify `.env` file exists and has correct values
3. Make sure you've run `npm run build` after changing `.env`
4. Try clearing cache and rebuilding

---

**Your mobile app should now work even without environment variables!** 🎉

The white screen issue is fixed - the app will show helpful error messages instead of crashing.

