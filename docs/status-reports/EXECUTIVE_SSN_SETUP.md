# Executive SSN Collection Setup Guide

This guide will help you set up the secure SSN collection system for executive appointments.

## Prerequisites

- Supabase project with Edge Functions enabled
- Access to Supabase Dashboard

## Step 1: Apply Database Migration

✅ **Ready to apply**: Run the SQL file `APPLY_EXECUTIVE_IDENTITY_TABLE.sql` in Supabase Dashboard > SQL Editor

1. Open Supabase Dashboard > SQL Editor
2. Copy the contents of `APPLY_EXECUTIVE_IDENTITY_TABLE.sql`
3. Paste and click "Run"
4. Verify the `executive_identity` table was created

## Step 2: Set Encryption Key

✅ **Encryption key generated**: `oko5J0y9fv5j1jQwJYodi5gEwkjoux5x5DyGoxz82y4=`

**This key has been generated for you.** Use it in the next step.

## Step 3: Set Edge Function Environment Variable

1. Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets
2. Click "Add new secret"
3. Name: `ENCRYPTION_KEY_B64`
4. Value: `oko5J0y9fv5j1jQwJYodi5gEwkjoux5x5DyGoxz82y4=`
5. Click "Save"

⚠️ **IMPORTANT**: Never commit this key to version control. It's stored in Supabase secrets.

## Step 4: Create Storage Bucket (Optional - for W-9 uploads)

1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: `executive-w9`
4. **Uncheck "Public bucket"** (keep it private)
5. Click "Create bucket"

## Step 5: Deploy Edge Function

✅ **Edge function deployed**: `save-executive-identity` is now live on your project

You can verify it in Supabase Dashboard > Edge Functions.

## Step 6: Test the Integration

1. Navigate to Board Portal > Appoint Corporate Officer
2. Fill out the appointment form
3. On Step 3 (Identity Verification), enter:
   - Date of Birth
   - Address information
   - SSN (split into 3-2-4 format)
4. Complete the appointment
5. Check Supabase logs to verify SSN was encrypted and saved

## Security Features

✅ **AES-256-GCM Encryption**: SSN is encrypted server-side before storage
✅ **No Plaintext Storage**: Only last 4 digits stored in plaintext for reference
✅ **RLS Protection**: Table has RLS enabled, no direct client access
✅ **Service Role Only**: Only Edge Functions with service role can access encrypted data
✅ **No Logging**: SSN is never logged in console or application logs

## Troubleshooting

### Error: "ENCRYPTION_KEY_B64 environment variable not set"
- Verify the secret is set in Supabase Dashboard > Edge Functions > Secrets
- Redeploy the edge function after setting the secret

### Error: "DB insert failed"
- Check that the migration was applied successfully
- Verify `executive_identity` table exists in your database
- Check RLS policies (should have no public policies)

### SSN not saving during appointment
- Check browser console for errors
- Check Supabase Edge Function logs
- Verify the edge function is deployed and active

## Admin Access

To view executive identity metadata (without SSN):

```sql
SELECT * FROM executive_identity_admin;
```

This view shows all fields except `ssn_ciphertext` and `ssn_iv`.

## Next Steps (Optional)

- Implement W-9 upload functionality using the `executive-w9` storage bucket
- Create an admin portal to view identity verification status
- Add email notifications when SSN is collected

