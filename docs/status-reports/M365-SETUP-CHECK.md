# M365 Email Provisioning Setup Check

## How to Verify M365 Setup is Working

### 1. Check Supabase Edge Function Environment Variables

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Verify these are set:
- `GRAPH_TENANT_ID` - Your Microsoft 365 Tenant ID
- `GRAPH_CLIENT_ID` - Your Azure App Registration Client ID
- `GRAPH_CLIENT_SECRET` - Your Azure App Registration Client Secret
- `GRAPH_DOMAIN` - Your domain (defaults to cravenusa.com if not set)

### 2. Test Email Provisioning

**Option A: Through the UI**
1. Go to CEO Command Center → Personnel Management
2. Click "Hire New Employee"
3. Fill in employee details
4. When suggested email appears, click "Issue Emails" button
5. Should see "Provision request queued" message

**Option B: Directly test the function**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/msgraph-provision \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "positionCode": "ceo",
    "domain": "cravenusa.com",
    "executive": true,
    "personalEmail": "test@example.com"
  }'
```

### 3. Check the Logs

**If provisioning fails:**
1. Go to Supabase Dashboard → Edge Functions → msgraph-provision → Logs
2. Look for error messages like:
   - `token_error 400` - Bad credentials
   - `token_error 401` - Unauthorized
   - `graph_error POST /users 403` - Missing permissions

**If provisioning succeeds:**
You'll see logs like:
```
User created: tstroman.ceo@cravenusa.com
Role alias created: ceo@cravenusa.com
Email logged to ms365_email_accounts
```

### 4. Verify Email Was Created

**Check in database:**
```sql
SELECT * FROM ms365_email_accounts 
WHERE email_address = 'tstroman.ceo@cravenusa.com';
```

Should show:
- `provisioning_status = 'active'`
- `provisioned_at` timestamp
- `ms365_user_id` from Microsoft Graph

**Check in Microsoft 365:**
1. Go to https://admin.microsoft.com
2. Users → Active users
3. Search for the email address
4. Should see the new user created

### 5. Common Issues & Fixes

**Issue:** "Provision request queued" but no email created
- **Fix:** Check Supabase logs for errors
- **Fix:** Verify Azure App Registration has correct permissions

**Issue:** `token_error` in logs
- **Fix:** Double-check GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET
- **Fix:** Ensure client secret hasn't expired

**Issue:** `graph_error 403 Forbidden`
- **Fix:** Grant these permissions to your Azure App:
  - `User.ReadWrite.All`
  - `Group.ReadWrite.All`
  - `Mail.Send`
- **Fix:** Admin consent must be granted

**Issue:** Email suggested but "Issue Emails" button does nothing
- **Fix:** Check browser console for errors
- **Fix:** Ensure function is deployed: `supabase functions deploy msgraph-provision`

### 6. Azure App Registration Setup

Your Azure app needs these permissions with **Admin Consent**:

**Microsoft Graph API Permissions:**
1. `User.ReadWrite.All` (Application permission)
2. `Group.ReadWrite.All` (Application permission)  
3. `Mail.Send` (Application permission)

**Steps:**
1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations
3. Select your app
4. API permissions → Add a permission
5. Select "Microsoft Graph" → "Application permissions"
6. Search and add the 3 permissions above
7. Click "Grant admin consent for [Your Organization]"

### 7. Required Admin Actions

After setting up the Azure app, **you must**:
1. Go to Azure Portal → App registrations
2. Click "Grant admin consent for [Your Organization]"
3. Wait for "Granted" status on all permissions
4. Without admin consent, provisioning will fail silently

---

## Current Status Check

**To verify your setup is working RIGHT NOW:**

1. ✅ Check if you can see "Suggested emails" in the hiring form
2. ❌ Click "Issue Emails" - does it say "Provision request queued"?
3. ❌ Check Supabase Edge Function logs for any errors
4. ❌ Run the SQL query to see if any M365 accounts exist
5. ❌ Check Microsoft 365 admin portal for new users

If any step fails, follow the troubleshooting steps above.

