# 📁 Where to Find Documents

## ✅ Document Vault Now Live!

### Location
**Board Portal → Document Vault Tab**

URL: `http://localhost:8080/board`

### How to Access
1. Go to **Board Portal** (`http://localhost:8080/board`)
2. Click the **"Document Vault"** tab
3. See all stored HR documents

---

## 📋 What Documents Will Show

### From `exec_documents` Table:
- Board Materials
- Financial Reports
- Legal Documents
- Strategic Plans

### From `employee_documents` Table:
- **Board Resolutions**
- **Offer Letters**
- **Equity Agreements**
- **Founders Agreements**
- Employment Contracts
- W2/W9 Forms

---

## 🚀 To See Documents

**You need to:**
1. **Deploy the database:** Run `DEPLOY-ALL-IN-ONE.sql` in Supabase SQL Editor
2. **Deploy edge functions:** `supabase functions deploy generate-hr-pdf` & `create-executive-user`
3. **Hire an executive:** Use CEO Portal → Personnel Manager to hire a C-level employee

**After hiring, the Document Vault will show:**
- Board Resolution PDF
- Offer Letter PDF
- Equity Agreement PDF (if applicable)
- Founders Agreement PDF (if CEO)

---

## 📝 Deployment Checklist

✅ **Code Complete:**
- DocumentVault component fetches from database
- PersonnelManager generates PDFs
- Board Portal has Document Vault tab

⏳ **Need to Deploy:**
- Run `DEPLOY-ALL-IN-ONE.sql` in Supabase
- Deploy 2 edge functions
- Hire a test executive

---

## 🎯 Next Step

**Follow:** `RUN-THIS-NOW.md` for complete deployment instructions

