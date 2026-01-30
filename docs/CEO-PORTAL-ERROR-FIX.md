# CEO Portal Production Error Fix

## Problem
CEO portal shows "Something went wrong" error in production but works in development.

## Likely Causes

### 1. Missing Database Tables
Production may be missing these tables that components expect:

- ✅ `ceo_mindmaps` - Strategic Mind Map
- ✅ `ceo_action_logs` - Audit Trail  
- ✅ `ceo_financial_approvals` - Financial Approvals
- ✅ `executive_signatures` - Executive Signatures
- ✅ `employees` - Personnel Manager
- ✅ `departments` - Personnel Manager
- ✅ `employee_equity` - Equity Dashboard
- ✅ `hr-documents` storage bucket
- ✅ `employee_documents` - Document Vault
- ✅ `board_resolutions` - Board Resolutions

### 2. Missing Edge Functions
These functions are called from components:

- `generate-hr-pdf`
- `create-executive-user`
- `send-executive-offer-letter`
- `get-executive-signature-by-token`
- `submit-executive-signature`

### 3. Environment Variables
Production may be missing required env vars.

---

## Quick Fix

### Run Missing Migrations
Copy and paste in Supabase SQL Editor:

```sql
-- Run this file:
DEPLOY-ALL-IN-ONE.sql
```

This includes:
- HR document system
- Board resolutions
- Mind maps (if needed separately)

---

## Verify Deployment

### Step 1: Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'ceo_mindmaps',
  'ceo_action_logs', 
  'executive_signatures',
  'employees',
  'departments',
  'employee_documents',
  'board_resolutions'
);
```

### Step 2: Check Edge Functions Deployed
Go to Supabase Dashboard → Functions

Verify these exist:
- `generate-hr-pdf`
- `create-executive-user`
- `get-executive-signature-by-token`
- `submit-executive-signature`

### Step 3: Check Storage Buckets
Dashboard → Storage

Verify `hr-documents` bucket exists.

---

## Test in Production

After running migrations:

1. Open CEO Portal: `https://cravenusa.com/ceo`
2. Sign in as CEO
3. Verify all tabs load without errors

---

## If Still Failing

Check browser console for specific error message:
- Open Developer Tools (F12)
- Look at Console tab
- Copy the exact error

Share the error for debugging.

