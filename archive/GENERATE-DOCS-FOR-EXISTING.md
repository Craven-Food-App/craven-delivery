# Generate Documents for Existing Executives

## 🎯 Goal
Generate all HR documents (PDFs) for existing CEO, CFO, CXO, and other C-level employees.

---

## ✅ Method 1: CEO Portal (Easiest)

### Step 1: Go to CEO Portal
URL: `http://localhost:8080/ceo-portal`

### Step 2: Navigate to Personnel
- Click "Personnel" tab at the top
- Find your CEO/CFO/CXO in the list

### Step 3: Generate Documents
**For each executive:**
1. Click the **"Resend All Documents"** button (or similar)
2. Or manually re-hire them (they'll get all documents)

**That's it!** Documents will be generated and stored.

---

## ⚙️ Method 2: Use Script (Advanced)

### Prerequisites
1. Deploy HR system first: `DEPLOY-ALL-IN-ONE.sql`
2. Deploy edge function: `supabase functions deploy generate-hr-pdf`

### Run Script
```bash
node scripts/generate-existing-exec-docs.js
```

**Required:** Set `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars.

---

## 📋 What Gets Generated

For each C-level executive:

**Executive Documents:**
- ✅ Board Resolution
- ✅ Offer Letter
- ✅ Equity Agreement (if equity granted)
- ✅ Founders Agreement (if CEO)

**Government Forms:**
- ✅ W-4
- ✅ I-9
- ✅ State tax form (OH/MI/GA/NY/KS)

**Company Forms:**
- ✅ Direct Deposit Authorization
- ✅ Emergency Contact
- ✅ Confidentiality & IP Assignment
- ✅ Arbitration Agreement

**Total: ~11-12 documents per executive**

---

## 🎯 Quickest Path

1. Deploy: Follow `RUN-THIS-NOW.md`
2. Open CEO Portal: `http://localhost:8080/ceo-portal`
3. Personnel tab → Resend documents for each executive
4. Check Board Portal → Document Vault

Done! ✅

