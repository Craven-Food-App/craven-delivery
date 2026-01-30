# 🔧 CHECK AZURE CREDENTIALS NOW

## Problem

M365 email accounts are **NOT being created** because Azure credentials are missing or misconfigured.

## Fix Required

**Go to:** Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Set these 3 secrets:**
1. `GRAPH_TENANT_ID` - Your Microsoft 365 Tenant ID
2. `GRAPH_CLIENT_ID` - Your Azure App Registration Client ID  
3. `GRAPH_CLIENT_SECRET` - Your Azure App Registration Client Secret

## How to Get Azure Credentials

### Step 1: Get Tenant ID
1. Go to https://portal.azure.com
2. Azure Active Directory → Overview
3. Copy "Tenant ID" → This is your `GRAPH_TENANT_ID`

### Step 2: Get Client ID & Secret
1. Azure Portal → Azure Active Directory → App registrations
2. Find your app (or create new one)
3. Copy "Application (client) ID" → This is your `GRAPH_CLIENT_ID`
4. Certificates & secrets → New client secret
5. Copy the value → This is your `GRAPH_CLIENT_SECRET`

### Step 3: Grant Permissions
Your Azure app needs these permissions:
- `User.ReadWrite.All` (Application)
- `Group.ReadWrite.All` (Application)
- Click "Grant admin consent for [Your Organization]"

## Verify It Works

After setting credentials, try hiring an employee. You should see:

**SUCCESS:**
```
✅ Employee hired successfully!
📧 M365 account created: jsmith.cfo@cravenusa.com
```

**FAILURE:**
```
⚠️ Failed to provision M365 account: Azure credentials not configured
```

Check Supabase logs: **Edge Functions → msgraph-provision → Logs**

---

**Status:** This is blocking email creation. Fix it now to enable M365 provisioning.

