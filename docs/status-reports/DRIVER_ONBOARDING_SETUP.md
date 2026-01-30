# 🚘 Crave'n Driver Onboarding System - Setup Guide

## Overview
Complete driver onboarding system with **in-app digital signatures**, encrypted identity storage, background checks, and zone-based waitlist management. No external e-signature service required!

## 🔧 Environment Variables Required

### Supabase Configuration
Add these to your Supabase project settings:

```bash
# Database
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Identity Encryption
IDENTITY_ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars
```

### Supabase Storage
Create a storage bucket for driver signatures:
- **Bucket name**: `driver-signatures`
- **Public**: `false` (private - only authenticated users)
- **File size limit**: `5MB`
- **Allowed MIME types**: `image/png`

### Client Environment (.env)
```bash
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📦 Database Setup

### 1. Run Migrations in Supabase SQL Editor

Run these migrations in order:

```bash
# 1. Main schema (tables, RLS, triggers, sample zones)
supabase/migrations/20251029000000_create_driver_onboarding_system.sql

# 2. Encryption functions (pgcrypto helpers)
supabase/migrations/20251029000001_create_identity_encryption_function.sql

# 3. Signature tracking (in-app signatures)
supabase/migrations/20251029000002_add_driver_signatures.sql
```

**Or use Supabase CLI:**
```bash
supabase db push
```

### 2. Verify Tables Created
Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'driver%' OR table_name = 'zones';
```

You should see:
- drivers
- driver_consents  
- driver_identity
- driver_background_checks
- driver_waitlist
- driver_signatures
- zones

---

## 🔐 Edge Functions Setup

### 1. Deploy Edge Functions

```bash
# Deploy required functions
supabase functions deploy intake-identity
supabase functions deploy start-onboarding
```

### 2. Set Edge Function Secrets

```bash
# Only need encryption key - no DocuSign needed!
supabase secrets set IDENTITY_ENCRYPTION_KEY=your-super-secret-32-char-minimum-key
```

---

## 📦 Supabase Storage Setup

### Create Signature Storage Bucket

1. Go to: [Supabase Storage](https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/storage/buckets)
2. Click **"New bucket"**
3. Configure:
   - **Name**: `driver-signatures`
   - **Public**: `false` (private)
   - **File size limit**: `5MB`
   - **Allowed MIME types**: `image/png`
4. Click **"Create bucket"**

### Set Bucket Policies

Run this SQL to allow drivers to upload their own signatures:

```sql
-- Allow authenticated users to upload their signatures
CREATE POLICY "drivers_upload_own_signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-signatures' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow drivers to view their own signatures
CREATE POLICY "drivers_view_own_signature"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'driver-signatures');
```

---

## 🧪 Testing the Flow

### Complete Flow Test:

1. **Navigate to**: `http://localhost:8080/driver-onboarding/signup`

2. **Fill out signup form** with test data:
   - Full Name: Test Driver
   - Email: test@example.com  
   - Phone: 4195551234
   - City: Toledo
   - ZIP: 43615
   - Password: Test1234!

3. **Accept legal consents** (all 3 checkboxes)

4. **Enter identity**:
   - DOB: 01/01/1990
   - SSN: 123-45-6789
   - DL: DL123456
   - State: OH

5. **Wait for background check** (auto-clears after 5 seconds)

6. **Review ICA** → Scroll through agreement

7. **Check "I have read and understand"** checkbox

8. **Draw your signature** in the canvas (mouse or touch)

9. **Click "Save Signature"** → Signature captured

10. **Click "Sign Agreement"** → Agreement signed!

11. **Auto-redirect** based on zone capacity:
    - If zone has space → Activation screen
    - If zone is full → Waitlist screen

---

## 🔍 Troubleshooting

### Issue: "Failed to upload signature" error
**Fix**: Ensure `driver-signatures` storage bucket is created and policies are set

### Issue: "Encryption failed" error  
**Fix**: Verify `IDENTITY_ENCRYPTION_KEY` is set in Edge Functions (min 32 characters)

### Issue: No zones available
**Fix**: Run the sample zones insert from the migration or add zones manually:
```sql
INSERT INTO public.zones (zip_code, city, state, capacity)
VALUES ('43615', 'Toledo', 'OH', 50);
```

### Issue: Driver stuck on background check
**Fix**: Manually update background check status:
```sql
UPDATE driver_background_checks 
SET status = 'clear', completed_at = now() 
WHERE driver_id = 'driver-id-here';
```

---

## 🎯 Admin Operations

### View All Drivers
```sql
SELECT id, full_name, email, status, created_at 
FROM drivers 
ORDER BY created_at DESC;
```

### View Waitlist
```sql
SELECT 
  d.full_name,
  d.email,
  z.city,
  z.state,
  w.position,
  w.added_at
FROM driver_waitlist w
JOIN drivers d ON w.driver_id = d.id
JOIN zones z ON w.zone_id = z.id
ORDER BY w.position;
```

### Activate Waitlisted Drivers
```sql
-- When you open new slots, run this to auto-activate next driver:
WITH next_driver AS (
  SELECT w.driver_id
  FROM driver_waitlist w
  JOIN zones z ON w.zone_id = z.id
  WHERE z.active_drivers < z.capacity
  ORDER BY w.position
  LIMIT 1
)
UPDATE drivers
SET status = 'active', activated_at = now()
WHERE id IN (SELECT driver_id FROM next_driver)
RETURNING *;
```

### Increase Zone Capacity
```sql
UPDATE zones 
SET capacity = capacity + 25 
WHERE zip_code = '43615';
```

---

## ✅ System Status Checklist

- [ ] Database migrations applied (all 3)
- [ ] Encryption functions created
- [ ] RLS policies active
- [ ] Supabase Storage bucket created (`driver-signatures`)
- [ ] Storage policies configured
- [ ] Edge Functions deployed (intake-identity, start-onboarding)
- [ ] Encryption key secret set
- [ ] Sample zones created
- [ ] Test signup successful
- [ ] Test consent flow working
- [ ] Test identity encryption working
- [ ] Test in-app signature capture
- [ ] Test signature storage
- [ ] Test waitlist logic
- [ ] Test activation flow

---

## 📊 Monitoring

### Key Metrics to Track:
- Signup conversion rate
- Average time to activation
- Waitlist size by zone
- Background check approval rate
- DocuSign completion rate

### Useful Queries:
```sql
-- Drivers by status
SELECT status, COUNT(*) FROM drivers GROUP BY status;

-- Waitlist summary
SELECT z.city, z.state, COUNT(w.id) as waitlist_size
FROM zones z
LEFT JOIN driver_waitlist w ON z.id = w.zone_id
GROUP BY z.city, z.state;

-- Recent signups (last 7 days)
SELECT COUNT(*) FROM drivers 
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 🚀 Next Steps

After basic system is working:
1. Implement actual background check provider integration (Checkr, etc.)
2. Set up automated email notifications for waitlist updates
3. Build admin dashboard for driver management
4. Add mobile app deep linking
5. Implement earnings calculator
6. Add referral bonus tracking

