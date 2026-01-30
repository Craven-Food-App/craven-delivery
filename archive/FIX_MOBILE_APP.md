# 🔧 Fix Mobile App - Database Migration Required

## ⚠️ CRITICAL: The mobile app won't work until you apply this database migration

The TypeScript errors are caused by missing database columns. Follow these steps to fix:

---

## 📋 Step 1: Apply Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add all missing background check and onboarding columns
ALTER TABLE public.craver_applications
ADD COLUMN IF NOT EXISTS background_check_initiated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_estimated_completion TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_report_id TEXT,
ADD COLUMN IF NOT EXISTS background_check_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS background_check_consent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS welcome_screen_shown BOOLEAN DEFAULT false;

-- Add merchant welcome column to restaurants
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS merchant_welcome_shown BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_craver_applications_background_check_status 
ON public.craver_applications(background_check_approved_at, onboarding_completed_at);

CREATE INDEX IF NOT EXISTS idx_craver_applications_onboarding 
ON public.craver_applications(onboarding_completed_at);

-- Add helpful comments
COMMENT ON COLUMN public.craver_applications.background_check_initiated_at IS 'When background check was started';
COMMENT ON COLUMN public.craver_applications.background_check_estimated_completion IS 'Estimated completion date for background check';
COMMENT ON COLUMN public.craver_applications.background_check_approved_at IS 'When background check was approved';
COMMENT ON COLUMN public.craver_applications.onboarding_completed_at IS 'When driver completed mobile onboarding';
COMMENT ON COLUMN public.craver_applications.welcome_screen_shown IS 'Whether welcome confetti has been shown';
COMMENT ON COLUMN public.restaurants.merchant_welcome_shown IS 'Whether merchant welcome confetti has been shown';
```

5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned"

### Option B: Using Supabase CLI

If you have Supabase CLI configured:

```bash
npx supabase db push
```

---

## 📋 Step 2: Regenerate TypeScript Types

After applying the migration, regenerate your types:

```bash
# Replace YOUR_PROJECT_ID with your actual Supabase project ID
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types.ts
```

**Find your Project ID:**
- Go to Supabase Dashboard → Settings → General → Reference ID

---

## 📋 Step 3: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verification

After completing all steps, check:

1. **No TypeScript errors** in terminal
2. **App compiles successfully**
3. **Navigate to `/mobile`**
4. **You should see:**
   - Orange loading screen (2.5 seconds)
   - Driver welcome screen with image
   - "FEED NOW" button working
   - Login screen after clicking button

---

## 🐛 If Still Not Working

### Check TypeScript Compilation

Run this to see any remaining errors:

```bash
npx tsc --noEmit
```

### Check Database Columns

In Supabase Dashboard → SQL Editor, run:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'craver_applications' 
AND column_name LIKE '%background%';
```

You should see:
- background_check
- background_check_initiated_at
- background_check_estimated_completion
- background_check_approved_at
- background_check_report_id
- background_check_consent
- background_check_consent_date

### Still Having Issues?

Check the browser console (F12) for errors and share them.

---

## 📝 What Was Fixed

### 1. Database Schema ✅
Added missing columns for:
- Background check tracking
- Onboarding completion
- Welcome screen flags

### 2. Loading Timer ✅
Restored 2.5 second loading screen delay for smooth UX

### 3. Error Handling ✅
Added 10-second failsafe timeout

---

## 🎯 Expected Flow After Fix

1. **Loading Screen** (2.5s) - Orange gradient with spinning logo
2. **Welcome Screen** - Driver on scooter image
3. **Click "FEED NOW"** - Login screen appears
4. **After Login**:
   - ✅ Approved → Dashboard
   - ⏳ Background check pending → Progress screen
   - 📚 Not onboarded → Onboarding wizard

---

**Questions? Check the commits or ask for help!**

