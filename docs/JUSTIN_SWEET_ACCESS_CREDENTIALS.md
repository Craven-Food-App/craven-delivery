# Justin Sweet - Access Credentials

**Position:** Chief Financial Officer (CFO)  
**Department:** Finance  
**Last Updated:** January 7, 2025

---

## 🔐 Login Credentials

### Primary Email
- **Email:** `jsweet.cfo@cravenusa.com`
- **User ID:** `5a259c29-8cdd-4569-9a3c-4f7481f1b441`

### Password
- **Temporary Password (Initial Setup):** `JustCrave516!`
- **Status:** User may have changed password on first login
- **Note:** Password change was required on first login

---

## 🔑 Portal PIN Access Numbers

### Main Hub PIN
- **PIN:** `101307`
- **Status:** Permanent, no reset required
- **Storage:** Stored in `ceo_access_credentials` table
- **Hash Method:** Plain text (same as CEO PIN system for consistency)

### PIN Verification
- **Function:** `verify_ceo_pin()`
- **Table:** `public.ceo_access_credentials`
- **Column:** `pin_hash` (stores PIN as plain text: `101307`)

---

## 🏢 Portal Access & Roles

### Company Portal Access
- **CRAVEN_EXECUTIVE** - Full executive access
- **CRAVEN_CFO** - CFO-specific access

### Access Level
- **Access Level:** `8` (highest level)
- **Title:** Chief Financial Officer
- **Department:** Finance

### Portal Access Points
1. **Main Hub** - PIN: `101307`
2. **CFO Portal** - Full access
3. **Company Portal** - Full access
4. **Investor Materials** - FULL ACCESS (per `torranceAccess.ts`)

---

## 📊 Database Records

### Tables with Justin Sweet's Data

1. **`auth.users`**
   - Email: `jsweet.cfo@cravenusa.com`
   - User ID: `5a259c29-8cdd-4569-9a3c-4f7481f1b441`
   - Email confirmed: Yes

2. **`user_profiles`**
   - Full name: `Justin Sweet`
   - Role: `admin` (for executive users)
   - Email: `jsweet.cfo@cravenusa.com`

3. **`exec_users`**
   - Role: `cfo`
   - Access level: `8`
   - Title: `Chief Financial Officer`
   - Department: `Finance`
   - Approved: Yes

4. **`ceo_access_credentials`**
   - Email: `jsweet.cfo@cravenusa.com`
   - PIN: `101307` (stored in `pin_hash` column)
   - Last access: Tracked in `last_access_at`
   - Access count: Tracked in `access_count`

5. **`user_roles`**
   - Role: `CRAVEN_EXECUTIVE`
   - Role: `CRAVEN_CFO`

---

## 🔍 Verification Queries

### Check PIN Configuration
```sql
SELECT 
  user_email,
  CASE 
    WHEN pin_hash IS NOT NULL THEN '✅ PIN configured: ' || pin_hash
    ELSE '❌ PIN missing'
  END as status,
  last_access_at,
  access_count,
  updated_at
FROM public.ceo_access_credentials
WHERE user_email = 'jsweet.cfo@cravenusa.com';
```

### Check User Roles
```sql
SELECT 
  u.email,
  ur.role,
  eu.title,
  eu.access_level
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN exec_users eu ON eu.user_id = u.id
WHERE u.email = 'jsweet.cfo@cravenusa.com';
```

### Check User Profile
```sql
SELECT 
  up.user_id,
  up.full_name,
  up.email,
  up.role,
  eu.title,
  eu.department,
  eu.access_level
FROM user_profiles up
LEFT JOIN exec_users eu ON eu.user_id = up.user_id
WHERE up.email = 'jsweet.cfo@cravenusa.com';
```

---

## 📝 Setup History

### Initial Setup
- **Setup Function:** `supabase/functions/setup-justin-sweet/index.ts`
- **Migration:** `20251126075118_88fcaf62-b672-438d-a7c3-f14f21c7ed16.sql`
- **PIN Migration:** `20251127045109_78e32eb0-6d16-4542-b30d-302d2b5d4225.sql`

### PIN Configuration
- **Initial PIN:** `101307` (temporary, hashed with bcrypt)
- **Current PIN:** `101307` (permanent, stored as plain text for consistency with CEO PIN system)
- **PIN Status:** Permanent, no reset required

---

## ⚠️ Security Notes

1. **PIN Storage:** PIN is stored as plain text in `ceo_access_credentials.pin_hash` for consistency with CEO PIN system
2. **Password:** Initial temporary password was `JustCrave516!` - user was required to change on first login
3. **Access:** Justin Sweet has FULL ACCESS to all investor materials (per `src/utils/torranceAccess.ts`)
4. **Roles:** Has both `CRAVEN_EXECUTIVE` and `CRAVEN_CFO` roles for comprehensive access

---

## 🔄 Related Files

- **Setup Function:** `supabase/functions/setup-justin-sweet/index.ts`
- **Access Utility:** `src/utils/torranceAccess.ts`
- **PIN Migration:** `supabase/migrations/20251127045109_78e32eb0-6d16-4542-b30d-302d2b5d4225.sql`
- **Role Migration:** `supabase/migrations/20250220000002_grant_executive_roles_for_voting.sql`

---

## 📞 Quick Reference

**Email:** `jsweet.cfo@cravenusa.com`  
**Hub PIN:** `101307`  
**User ID:** `5a259c29-8cdd-4569-9a3c-4f7481f1b441`  
**Roles:** `CRAVEN_EXECUTIVE`, `CRAVEN_CFO`  
**Access Level:** `8`

---

**Document Status:** Complete  
**Last Verified:** January 7, 2025


