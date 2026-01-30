# Asset Management Setup Guide

## ⚠️ IMPORTANT: Run These Steps First!

The Asset Management system requires two setup steps before it will work:

---

## 📋 Step 1: Run Database Migrations

You need to run **two** migrations for full functionality:

### Migration 1: Create Marketing Assets Table

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file: `supabase/migrations/20250131000013_create_marketing_assets_table.sql`
6. **Copy ALL the contents** of that file
7. **Paste** into the SQL Editor
8. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

You should see: **"Success. No rows returned"** or similar success message.

### Migration 2: Add Video Thumbnail Support

1. In the SQL Editor, click **New Query** again
2. Open the file: `supabase/migrations/20250131000015_add_thumbnail_url_to_marketing_assets.sql`
3. **Copy ALL the contents** of that file
4. **Paste** into the SQL Editor
5. Click **Run**

**Note:** Migration 2 adds the `thumbnail_url` column for video preview thumbnails. If you already ran Migration 1, this will safely add the column to your existing table.

### Option B: Using Supabase CLI

If you have Supabase CLI configured:

```bash
npx supabase db push
```

This will apply all pending migrations including both marketing_assets migrations.

### Step 2: Create Storage Bucket and Policies

#### Option A: Using Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Name it: `marketing-assets` (exact name, with hyphen)
5. Set it to **Public**
6. Click **"Create bucket"**

Then run the storage policies migration (see Option B below).

#### Option B: Using Migration (Recommended - Creates Bucket + Policies)

Run the storage setup migration:

1. Go to Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Open the file: `supabase/migrations/20250131000014_setup_marketing_assets_storage.sql`
4. **Copy ALL the contents** of that file
5. **Paste** into the SQL Editor
6. Click **Run**

**Note:** If the bucket creation fails (requires superuser), create it manually in the Dashboard first, then run the migration to set up the policies.

## Verification

After setup:
1. The Asset Management page should load without errors
2. You should be able to upload files
3. Uploaded files should appear in the asset grid
4. **Video files will automatically generate thumbnails** (preview images) for easier selection
5. Files should be accessible via their public URLs

## Features

- **Image Assets**: Display as preview thumbnails
- **Video Assets**: Automatically generate and display preview thumbnails from the video
- **PDF Assets**: Display with PDF icon
- **Organized by Folders**: Campaigns, Merchants, Brand Guidelines, Social Media, etc.

## Troubleshooting

- **"Bucket not found" error**: Make sure the bucket is named exactly `marketing-assets`
- **"Table not found" error**: Run the migration file
- **Upload fails**: Check storage bucket permissions and file size (max 10MB)

