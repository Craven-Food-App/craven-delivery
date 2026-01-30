# Deploy HR Document Management System

## ✅ What's Been Created

### **1. Database Migration** ✅
- `supabase/migrations/20250122000001_create_hr_document_system.sql`
- Storage bucket: `hr-documents`
- Table: `employee_documents` 
- Tables linked: `board_resolutions`, `exec_documents`, `employees`
- Helper functions for querying documents

### **2. Edge Function** ✅
- `supabase/functions/generate-hr-pdf/index.ts`
- Generates HTML for all document types
- Stores in `hr-documents` bucket
- Links to `employee_documents` table
- Optional email sending

---

## 🚀 Deployment Steps

### **Step 1: Run Migration**
```bash
# In Supabase SQL Editor, run:
# Copy contents of: supabase/migrations/20250122000001_create_hr_document_system.sql
```

### **Step 2: Deploy Edge Function**
```bash
supabase functions deploy generate-hr-pdf
```

### **Step 3: Update PersonnelManager.tsx**
Update the hire flow to use the new PDF system.

---

## 📋 What Needs to be Updated

### **PersonnelManager.tsx Changes:**

**Current (Line 484-531):**
- Only sends HTML emails
- No documents stored

**Needed:**
- Call `generate-hr-pdf` for each document
- Store returned document IDs
- Link to `board_resolutions.employee_id`

**Also need to fix (Line 468):**
```typescript
// CURRENT (WRONG):
await supabase.from('exec_users').insert([{ 
  user_id: null,  // ❌ No real user!
  role: execRole 
}])

// NEEDED:
// 1. Create auth user first
// 2. Then exec_users with real user_id
```

---

## 🔗 Next Steps

1. Deploy migration
2. Deploy edge function  
3. Update PersonnelManager to use `generate-hr-pdf`
4. Fix `exec_users` creation
5. Add document viewer to Board Portal

---

**Status**: ✅ **Infrastructure ready, needs PersonnelManager updates**

