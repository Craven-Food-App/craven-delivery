# 🔧 RLS Migration Column Fixes

## Fixed Column Name Issues

The initial migration had incorrect column names. Here are the corrections:

### ✅ **Corrected Tables:**

1. **phone_verifications**
   - ❌ Was using: `user_id`
   - ✅ Now using: `email` (via `auth.jwt()->>'email'`)
   - Schema: Table stores `email` and `phone`, no `user_id` column

2. **expense_approval_log**
   - ❌ Was using: `approver_id`
   - ✅ Now using: `actor_id`
   - Schema: Table has `actor_id` for the person performing the action

3. **eas_documents**
   - ❌ Was using: `executive_id`
   - ✅ Now using: `created_by`
   - Schema: Table has `created_by` referencing exec_users(id)

4. **customer_orders**
   - ❌ Was using: `customer_id`
   - ✅ Now using: `customer_email` (via `auth.jwt()->>'email'`)
   - Schema: Table stores `customer_email`, not a user ID reference

5. **marketing_assets**
   - ✅ Correctly uses: `uploaded_by`
   - Added proper INSERT/UPDATE/DELETE policy split

### 📝 **Key Changes:**

```sql
-- Phone Verifications
-- OLD: USING (user_id = auth.uid())
-- NEW: USING (email = auth.jwt()->>'email')

-- Expense Approval Log
-- OLD: USING (approver_id = auth.uid() OR ...)
-- NEW: USING (actor_id = auth.uid() OR ...)

-- EAS Documents
-- OLD: USING (executive_id = auth.uid() OR ...)
-- NEW: USING (created_by = auth.uid() OR ...)

-- Customer Orders
-- OLD: WITH CHECK (customer_id = auth.uid())
-- NEW: WITH CHECK (customer_email = auth.jwt()->>'email')

-- Marketing Assets
-- NEW: Split into SELECT (all users) and INSERT/UPDATE/DELETE (team only)
```

### ✅ **Migration Status:**

- File: `supabase/migrations/20251220000001_fix_permissive_rls_policies.sql`
- Status: **READY TO APPLY**
- All column names verified against actual schema
- Policies properly scoped to correct columns

### 🎯 **Next Steps:**

1. Apply the corrected migration
2. Test each affected table's access control
3. Verify no other tables have similar issues

---

*Fixed: December 20, 2025*

