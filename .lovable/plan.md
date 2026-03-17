

# Grant Jason Parcell Access to Merchant Operations Portal

## Problem
The Merchant Operations Portal (`/merchant-operations`) is wrapped in `AdminAccessGuard`, which **only** allows users with `role = 'admin'` in the `user_roles` table. Jason Parcell (CPO) has no `admin` role, so he's blocked.

## Solution

### 1. Update `useMerchantStatus.ts`
Remove the merchant portal logic change from the previous plan since it's not needed.

### 2. Update Merchant Operations Portal access guard
Replace `AdminAccessGuard` with a new or modified guard that grants access to:
- Users with `admin` role in `user_roles`
- Executive users with `cpo` or `ceo` role in `exec_users`

Two options:
- **Option A**: Create a dedicated `MerchantOpsAccessGuard` component that checks both `user_roles` (admin) and `exec_users` (cpo, ceo)
- **Option B**: Modify `MerchantOperationsPortal.tsx` to use a more flexible guard pattern

I'll go with **Option A** — a small wrapper component that checks:
```typescript
// Check admin role
const { data: adminRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .maybeSingle();

// Check exec role (cpo, ceo)
const { data: execUser } = await supabase
  .from('exec_users')
  .select('role')
  .eq('user_id', user.id)
  .maybeSingle();

const isAdmin = adminRole?.role === 'admin';
const isExecWithAccess = ['cpo', 'ceo'].includes(execUser?.role?.toLowerCase());
setHasAccess(isAdmin || isExecWithAccess);
```

### 3. Database: Add `CRAVEN_EXECUTIVE` role for Jason Parcell
Insert into `user_roles`:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('06847119-d5e5-44dc-a5f4-6b3b677d9423', 'CRAVEN_EXECUTIVE')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Files Changed
- **New**: `src/components/MerchantOpsAccessGuard.tsx` — access guard allowing admin + CPO/CEO exec users
- **Modified**: `src/pages/MerchantOperationsPortal.tsx` — swap `AdminAccessGuard` for `MerchantOpsAccessGuard`
- **Migration**: Insert `CRAVEN_EXECUTIVE` role for Jason Parcell

