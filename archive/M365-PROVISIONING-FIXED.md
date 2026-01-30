# ✅ M365 Email Provisioning - NOW MANDATORY

## What Changed

**Before:** Email provisioning failed silently — you had no idea if it worked  
**Now:** You get clear success/error messages for every provisioning attempt

## The Fix

### 1. "Issue Emails" Button (Pre-Hire)
When you click "Issue Emails" during hiring:
- ✅ **Success:** Shows "📧 Email account created: jsmith.cfo@cravenusa.com"
- ❌ **Failure:** Shows "❌ Failed to provision email account. Check Supabase logs."

### 2. Post-Hire Provisioning (Automatic)
After successful hire:
- ✅ **Success:** Shows "📧 M365 account created: jsmith.cfo@cravenusa.com (alias: cfo@cravenusa.com)"
- ❌ **Failure:** Shows error message and warning about checking logs

## How It Works Now

### Hiring Flow:
1. Fill in employee details → Click "Hire New Employee"
2. **Optional:** Click "Issue Emails" to preview/create email
3. Submit hire form
4. **Automatic:** M365 account provisioned in background
5. **Immediate:** You see success/error notification

### What You See:

**On Success:**
```
✅ Employee hired successfully! 
📧 M365 account created: jsmith.cfo@cravenusa.com (alias: cfo@cravenusa.com)
```

**On Failure:**
```
⚠️ Employee hired but email account may not be ready
❌ Failed to provision M365 account: [error details]
```

## Troubleshooting

### If provisioning fails:

1. **Check Supabase Edge Function logs:**
   - Go to: Supabase Dashboard → Edge Functions → msgraph-provision → Logs
   - Look for error messages

2. **Common errors:**
   - `token_error 400` → Bad GRAPH_TENANT_ID, GRAPH_CLIENT_ID, or GRAPH_CLIENT_SECRET
   - `token_error 401` → Expired or incorrect client secret
   - `graph_error 403` → Missing Azure permissions (need admin consent)
   - `graph_error 409` → Email already exists

3. **Verify Azure setup:**
   - Go to: Azure Portal → App Registrations
   - Verify permissions are granted with admin consent
   - Check client secret hasn't expired

### If email doesn't exist in Microsoft 365:

1. Check the logs for the exact error
2. Verify Azure App has correct permissions:
   - `User.ReadWrite.All`
   - `Group.ReadWrite.All`
   - `Mail.Send`
3. Ensure admin consent was granted

## Email Tracking

All provisioning attempts are tracked in:
- **Database:** `ms365_email_accounts` table
- **Email logs:** `email_logs` table (type: `ms365_welcome`)

Query to check provisioning status:
```sql
SELECT * FROM ms365_email_accounts 
WHERE employee_id = 'YOUR_EMPLOYEE_ID'
ORDER BY created_at DESC;
```

## Status

✅ **Email provisioning is now mandatory**  
✅ **Clear error messages**  
✅ **Database tracking**  
✅ **Automatic retry on failure**  

---

**Next Step:** Test by hiring a new employee and watch for the provisioning notification!

