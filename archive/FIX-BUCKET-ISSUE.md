# 🔧 Fix "Bucket not found" Error

## Problem
Document previews show "Bucket not found" errors even though documents were generated.

## Root Cause
The storage buckets don't exist in your Supabase project yet, or they exist but aren't configured correctly.

## ✅ Solution: Apply Migration

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your **craven-delivery** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Bucket Creation Migration
Copy and paste the ENTIRE contents of:
`supabase/migrations/20250211000015_ensure_governance_buckets_exist.sql`

Or copy this:

```sql
-- Ensure all governance storage buckets exist
-- Create governance-certificates bucket (public for easier document viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('governance-certificates', 'governance-certificates', true, 5242880, ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg'];

-- Create governance-resolutions bucket (public for easier document viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('governance-resolutions', 'governance-resolutions', true, 10485760, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['application/pdf', 'text/html'];

-- Create contracts-executives bucket (public for easier document viewing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('contracts-executives', 'contracts-executives', true, 10485760, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['application/pdf', 'text/html'];
```

### Step 3: Verify Buckets Were Created
Run this query to check:

```sql
SELECT id, name, public, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('governance-certificates', 'governance-resolutions', 'contracts-executives');
```

You should see 3 rows returned.

### Step 4: Regenerate Documents
After creating the buckets:
1. Go back to the Appointments page
2. Click on an appointment
3. Click "Regenerate All Documents"
4. This will create new documents in the existing buckets

## 🐛 If Still Not Working

### Check if buckets exist in Storage UI:
1. Go to Supabase Dashboard → Storage
2. You should see these buckets:
   - `governance-certificates`
   - `governance-resolutions`
   - `contracts-executives`

### If buckets don't appear:
- The migration didn't run successfully
- Check for error messages in SQL Editor
- Try running the INSERT statements one at a time

### If buckets exist but documents still fail:
- The document URLs might be pointing to wrong paths
- Regenerate the documents to create new URLs
- Check the browser console for specific error messages




