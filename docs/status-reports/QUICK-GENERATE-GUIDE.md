# ⚡ Quick Guide: Generate Docs for Existing Execs

## TL;DR

**Deploy the system, then use CEO Portal to resend documents.**

---

## Step 1: Deploy (5 min)

**Copy & run in Supabase SQL Editor:**
`DEPLOY-ALL-IN-ONE.sql`

**Deploy edge function:**
```bash
supabase functions deploy generate-hr-pdf
```

---

## Step 2: Generate Documents (2 min)

**Option A: CEO Portal**
1. Go to: `http://localhost:8080/ceo-portal`
2. Click "Personnel" tab
3. Find your CEO/CFO/CXO
4. Click "Resend All Documents"

**Option B: Manual Re-hire**
1. Same portal
2. Click "Hire" button for each executive
3. Re-enter their info
4. Documents auto-generate

---

## Step 3: Verify (30 sec)

1. Go to: `http://localhost:8080/board-portal`
2. Click "Document Vault" tab
3. See all PDFs listed ✅

---

## 📊 Expected Results

**For each executive, you'll see:**
- Board Resolution PDF
- Offer Letter PDF
- Equity Agreement PDF
- W-4 PDF
- I-9 PDF
- State tax form PDF
- Direct Deposit PDF
- Emergency Contact PDF
- Confidentiality & IP PDF
- Arbitration PDF

**Plus (for CEO only):**
- Founders Agreement PDF

**= 11-12 documents total per executive**

---

**Status:** Ready to deploy and generate!
**Files:** `RUN-THIS-NOW.md` for deployment, then this guide for generation

