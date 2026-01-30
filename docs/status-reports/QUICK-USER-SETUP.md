# ⚡ QUICK USER SETUP

## ❗ **Important Limitation**

`exec_users` has `UNIQUE(user_id)` constraint - **one user can only have ONE role**.

---

## 🎯 **Best Approach**

**Create separate users for COO and CTO** in Supabase Auth.

### **Step 1: Create Users**

Go to: **Supabase Dashboard → Authentication → Users → Add User**

Create:
1. **COO user** (e.g., `coo@cravenusa.com`)
2. **CTO user** (e.g., `cto@cravenusa.com`)

### **Step 2: Run This SQL**

Use the NEW file: **`CREATE-EXEC-USERS-FIXED.sql`**

Or use this quick version:

```sql
-- Get your user IDs
SELECT id, email FROM auth.users;

-- Insert COO (replace UUID)
INSERT INTO public.exec_users (user_id, role, access_level, title, department) VALUES
  ('<coo-user-uuid>', 'coo', 9, 'Chief Operating Officer', 'Operations')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Insert CTO (replace UUID)
INSERT INTO public.exec_users (user_id, role, access_level, title, department) VALUES
  ('<cto-user-uuid>', 'cto', 9, 'Chief Technology Officer', 'Technology')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Verify
SELECT eu.*, u.email 
FROM public.exec_users eu
JOIN auth.users u ON u.id = eu.user_id
WHERE eu.role IN ('coo', 'cto');
```

---

## 🚀 **Quick Test**

If you want to test **immediately** with your existing CEO account:

```sql
-- Temporarily make yourself COO to test the portal
INSERT INTO public.exec_users (user_id, role, access_level, title, department) 
SELECT id, 'coo', 9, 'Chief Operating Officer', 'Operations'
FROM auth.users 
WHERE email = 'craven@usa.com'  -- Your email
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Then switch to CTO to test that portal
UPDATE public.exec_users SET role = 'cto', title = 'Chief Technology Officer', department = 'Technology'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'craven@usa.com');
```

---

## ✅ **Verify Access**

Visit:
- `coo.cravenusa.com` → Should load COO portal
- `cto.cravenusa.com` → Should load CTO portal

---

**The `CREATE-EXEC-USERS-FIXED.sql` file has been updated!** Run that instead of the old one.

