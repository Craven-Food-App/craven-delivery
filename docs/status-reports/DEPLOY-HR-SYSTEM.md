# Deploy HR Document System

## ✅ Code Complete
- PersonnelManager generates PDFs and stores them
- DocumentVault displays all stored documents
- Edge functions ready: `generate-hr-pdf`, `create-executive-user`

## 🚀 Deploy Now

### Step 1: Deploy SQL Migration
**Open Supabase Dashboard → SQL Editor**

**Copy & run this entire file:**
`DEPLOY-ALL-IN-ONE.sql`

This creates:
- `hr-documents` storage bucket
- `employee_documents` table
- `board_resolutions` table (if missing)
- Links between employees and documents
- RLS policies and helper functions

### Step 2: Deploy Edge Functions

```bash
supabase functions deploy generate-hr-pdf
supabase functions deploy create-executive-user
```

### Step 3: Verify Deployment

Run this in SQL Editor to check tables:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employee_documents', 'board_resolutions', 'exec_documents');

SELECT name FROM storage.buckets WHERE id = 'hr-documents';
```

Should return:
- ✅ employee_documents
- ✅ board_resolutions  
- ✅ exec_documents
- ✅ hr-documents

### Step 4: Test
1. **Hire a C-level employee** in CEO Portal → Personnel Manager
2. **Check Board Portal → Document Vault** - should show PDFs
3. **Verify Documents**:
   - Board Resolution
   - Offer Letter
   - Equity Agreement (if applicable)
   - Founders Agreement (if CEO)

---

## 📊 What This System Does

### For New Hires:
1. **Creates real auth.users** (not null user_ids)
2. **Generates PDF documents** from templates
3. **Stores PDFs** in `hr-documents` bucket
4. **Links documents** to employees in database
5. **Emails documents** to new hire
6. **Tracks in Board Portal** Document Vault

### For Board Members:
- **View all employee documents** in Document Vault
- **Download contracts**, resolutions, agreements
- **Track executive hires** and their paperwork
- **Audit trail** of all documents

---

## 🎯 Next Steps After Deployment

1. **Deploy edge functions** (see Step 2 above)
2. **Hire a test CEO** to generate documents
3. **Check Document Vault** to see stored PDFs
4. **Verify links** between employees and documents

