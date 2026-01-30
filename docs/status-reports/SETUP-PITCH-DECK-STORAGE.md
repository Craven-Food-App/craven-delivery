# Setup Pitch Deck Storage Buckets

If you encountered a permission error when running the migration, you need to create the storage buckets manually through the Supabase Dashboard.

## Manual Bucket Creation Steps

### 1. Navigate to Storage
- Go to your Supabase project dashboard
- Click **Storage** in the left sidebar

### 2. Create `pitch-deck-assets` Bucket
1. Click **"New bucket"**
2. **Bucket name**: `pitch-deck-assets`
3. **Public bucket**: ✅ Enable (checked)
4. **File size limit**: `20 MB`
5. **Allowed MIME types**: 
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `image/gif`
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
6. Click **"Create bucket"**

### 3. Create `pitch-deck-videos` Bucket
1. Click **"New bucket"**
2. **Bucket name**: `pitch-deck-videos`
3. **Public bucket**: ✅ Enable (checked)
4. **File size limit**: `50 MB`
5. **Allowed MIME types**:
   - `video/mp4`
   - `video/webm`
   - `video/quicktime`
   - `video/x-msvideo`
6. Click **"Create bucket"**

### 4. Run the Policies Migration
After creating the buckets, run the policies section of the migration:
- The migration file: `supabase/migrations/20250218000008_create_pitch_deck_storage_buckets.sql`
- You can skip the bucket creation part (lines 5-24) and run only the policies section (lines 26+)

Or run this SQL in the Supabase SQL Editor:

```sql
-- Public read access for pitch-deck-assets
DROP POLICY IF EXISTS "Public read access for pitch-deck-assets" ON storage.objects;
CREATE POLICY "Public read access for pitch-deck-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-deck-assets');

-- Public read access for pitch-deck-videos
DROP POLICY IF EXISTS "Public read access for pitch-deck-videos" ON storage.objects;
CREATE POLICY "Public read access for pitch-deck-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-deck-videos');

-- Admins can upload to pitch-deck-assets
DROP POLICY IF EXISTS "Admins can upload to pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can upload to pitch-deck-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can update/delete pitch-deck-assets
DROP POLICY IF EXISTS "Admins can update pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can update pitch-deck-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

DROP POLICY IF EXISTS "Admins can delete pitch-deck-assets" ON storage.objects;
CREATE POLICY "Admins can delete pitch-deck-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pitch-deck-assets' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can upload to pitch-deck-videos
DROP POLICY IF EXISTS "Admins can upload to pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can upload to pitch-deck-videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

-- Admins can update/delete pitch-deck-videos
DROP POLICY IF EXISTS "Admins can update pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can update pitch-deck-videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );

DROP POLICY IF EXISTS "Admins can delete pitch-deck-videos" ON storage.objects;
CREATE POLICY "Admins can delete pitch-deck-videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pitch-deck-videos' AND
    auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'INTERN_PROGRAM_ADMIN')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('CRAVEN_FOUNDER', 'CRAVEN_CEO'))
    )
  );
```

## Verification

After creating the buckets and running the policies, verify they exist:

```sql
SELECT id, name, public FROM storage.buckets WHERE id IN ('pitch-deck-assets', 'pitch-deck-videos');
```

You should see both buckets listed.

