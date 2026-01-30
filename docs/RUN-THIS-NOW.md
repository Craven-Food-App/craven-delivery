# 🚀 DEPLOY HR SYSTEM NOW

## Quick 3-Step Deployment

### 1️⃣ Run SQL Migration
**Open Supabase Dashboard → SQL Editor → New Query**

**Copy & paste entire file:**
`DEPLOY-ALL-IN-ONE.sql`

**Click Run**

### 2️⃣ Deploy Edge Functions
Open terminal in project root:

```bash
supabase functions deploy generate-hr-pdf
supabase functions deploy create-executive-user
```

### 3️⃣ Test It Works
1. Go to CEO Portal: http://localhost:8080/ceo-portal
2. Click "Personnel Manager" tab
3. Hire a test CFO or COO with equity
4. Check Board Portal: http://localhost:8080/board-portal
5. Click "Document Vault" tab
6. **Documents should appear!** ✅

---

## ✅ What's Fixed
- **DocumentVault** now shows all HR documents from database
- **PersonnelManager** generates PDFs and stores them
- **Board resolutions** linked to employees
- **C-level hires** create real auth.users
- **All documents** stored in `hr-documents` bucket

---

## 🎯 Next Hire
When you hire a new C-level executive:
1. PDFs automatically generated
2. Stored in Supabase Storage
3. Linked to employee in database
4. Visible in Board Portal Document Vault
5. Emailed to new hire

