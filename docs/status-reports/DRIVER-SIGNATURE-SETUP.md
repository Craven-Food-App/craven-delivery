# Driver Signature System - Emergency Setup

## 🚨 CRITICAL: Driver signature system is not deployed to production

The driver signature flow is failing because the `driver_signatures` table and storage bucket are missing.

---

## 📋 Setup Instructions

### STEP 1: Create Storage Bucket (Supabase Dashboard)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name:** `driver-signatures`
   - **Public:** ❌ **Unchecked** (private bucket)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** `image/png`, `image/jpeg`, `image/jpg`
4. Click **"Create bucket"**

### STEP 2: Run Deployment SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `DEPLOY-DRIVER-SIGNATURES.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**

**Expected output:** No errors, verification queries return results.

### STEP 3: Verify Deployment

Run this in SQL Editor:

```sql
-- Check table exists
SELECT 
  'driver_signatures table exists' as check_result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'driver_signatures';

-- Check constraint exists
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'driver_signatures' 
AND constraint_name = 'unique_driver_agreement';

-- Check storage policies
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%driver%signature%';
```

### STEP 4: Test Driver Signature Flow

1. Go to `https://cravenusa.com/driver-onboarding/sign-agreement`
2. Draw signature
3. Click "Sign Agreement"
4. Should redirect to waitlist/activation page

---

## ⚠️ What This Deploys

### Tables
- ✅ `driver_signatures` - Stores signature metadata and legal tracking

### Storage Bucket
- ✅ `driver-signatures` - Stores actual signature image files

### RLS Policies
- ✅ SELECT: Drivers can view their own signatures
- ✅ INSERT: Drivers can upload their own signatures  
- ✅ UPDATE: Drivers can update/replace their signatures
- ✅ Owner (`craven@usa.com`) has full access

### Unique Constraint
- ✅ `unique_driver_agreement` - Ensures one signature per driver per agreement type
- ⚠️ **CRITICAL:** This constraint is required for the upsert operation to work

---

## 🔗 Related Files

- `supabase/migrations/20251029000002_add_driver_signatures.sql` - Table creation
- `supabase/migrations/20251029000006_ensure_driver_signatures_unique_constraint.sql` - Unique constraint
- `supabase/migrations/20251029000005_fix_driver_signatures_rls.sql` - RLS policies
- `supabase/migrations/20251029000007_create_driver_signatures_bucket.sql` - Storage bucket
- `src/pages/driverOnboarding/SignAgreement.tsx` - Frontend component

---

## 🐛 Troubleshooting

### Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
**Cause:** Unique constraint missing  
**Fix:** Run `DEPLOY-DRIVER-SIGNATURES.sql`

### Error: "relation driver_signatures does not exist"
**Cause:** Table not deployed  
**Fix:** Run `DEPLOY-DRIVER-SIGNATURES.sql`

### Error: "must be owner of relation objects"
**Cause:** SQL tried to create storage bucket  
**Fix:** Create bucket manually via Supabase Dashboard

### Error: "permission denied for table storage.objects"
**Cause:** Storage policies not created  
**Fix:** Run `DEPLOY-DRIVER-SIGNATURES.sql`

---

**Last Updated:** January 2025

