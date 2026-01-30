# 🚀 Quick Start: Deploy HR System NOW

## ⚡ 3-Step Deployment (10 Minutes)

### **Step 1: Deploy Migration** (2 min)
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy ALL contents from `supabase/migrations/20250122000001_create_hr_document_system.sql`
4. Paste into SQL Editor
5. Click "Run"
6. ✅ Should see "Success. No rows returned"

### **Step 2: Deploy Edge Functions** (5 min)
Open terminal in `D:\Repositories\craven-delivery` and run:

```bash
supabase functions deploy generate-hr-pdf
supabase functions deploy create-executive-user
```

### **Step 3: Create Your First Executive** (3 min)

**Option A: Via SQL (Fastest)**
Go to Supabase SQL Editor and run:

```sql
-- First, create auth user for CEO
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'torrence.stroman@cravenusa.com',
  crypt('TempPass123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Torrance","last_name":"Stroman","position":"CEO","department":"Executive"}'
) RETURNING id;
```

**Then create employee record:**
```sql
-- Insert the CEO as an employee
INSERT INTO public.employees (
  user_id,
  employee_number,
  first_name,
  last_name,
  email,
  position,
  employment_type,
  employment_status,
  hire_date,
  salary,
  hired_by
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'torrence.stroman@cravenusa.com'),
  'CEO-001',
  'Torrance',
  'Stroman',
  'torrence.stroman@cravenusa.com',
  'CEO',
  'full-time',
  'active',
  CURRENT_DATE,
  200000,
  (SELECT id FROM auth.users WHERE email = 'torrence.stroman@cravenusa.com')
);

-- Create exec_users entry
INSERT INTO public.exec_users (
  user_id,
  role,
  access_level,
  title,
  department,
  approved_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'torrence.stroman@cravenusa.com'),
  'ceo',
  10,
  'CEO',
  'Executive',
  NOW()
);
```

---

## ✅ Verify It Works

1. **Refresh Board Portal** → Should show CEO
2. **Check Directory tab** → CEO should appear
3. **Try CEO Portal** → Should work

---

## 🐛 If Still Showing 0

**Check console** (F12 → Console):
- Any errors?
- RLS policy issues?

**Check Supabase:**
```sql
SELECT * FROM employees WHERE position = 'CEO';
SELECT * FROM exec_users WHERE role = 'ceo';
```

**Most likely issue:** RLS policies blocking read access

---

**After this works, then hire more execs via Personnel Manager!** 🎯

