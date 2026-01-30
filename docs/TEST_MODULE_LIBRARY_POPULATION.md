# Test Module Library Population - Complete

## Overview

This migration populates the Test Module Library with **13 core modules** exactly as specified in the step-by-step guide.

## Migration File

**File:** `supabase/migrations/20250218000001_populate_test_module_library.sql`

## Modules Added

### Onboarding Modules (3)
1. **Crave'n Culture & Ownership Assessment** (L1, Onboarding)
   - Pass Threshold: 80%
   - Retakes: 1
   - Reviewer: Manager
   - Artifact Required: Yes
   - Counts Toward Promotion: ❌ No

2. **Role Understanding & Accountability Test** (L1, Onboarding)
   - Pass Threshold: 70% (Pass/Fail)
   - Reviewer: Manager
   - Counts Toward Promotion: ❌ No

3. **Internship Learning Objectives & Initial Reflection** (L1, Onboarding) - Academic Credit
   - Pass Threshold: 70% (Completion)
   - Reviewer: Manager
   - Retakes: Unlimited (999)
   - Counts Toward Promotion: ❌ No

### Technology Track Modules (3)
4. **Platform Systems Audit** (L3, Tech)
   - Time Limit: 120 minutes
   - Pass Threshold: 85%
   - Reviewer: Executive
   - Artifact Required: Yes
   - Counts Toward Promotion: ✅ Yes
   - Allowed States: INTERN_ACTIVE, ACTING_EXECUTIVE

5. **Internal Tool / Automation Build** (L3, Tech)
   - Time Limit: 72 hours (4320 minutes)
   - Pass Threshold: 70% (Functional delivery)
   - Reviewer: Executive
   - Artifact Required: Yes
   - Counts Toward Promotion: ✅ Yes

6. **Executive Decision Memo (Technology)** (L3, Leadership)
   - Pass Threshold: 80% (Executive Approval)
   - Reviewer: Executive
   - Counts Toward Promotion: ✅ Yes

### Strategy/Ops Track Modules (3)
7. **KPI Framework Design** (L3, Ops)
   - Pass Threshold: 85%
   - Reviewer: Executive
   - Artifact Required: Yes
   - Counts Toward Promotion: ✅ Yes

8. **Process Bottleneck & Risk Analysis** (L2, Quality)
   - Pass Threshold: 80%
   - Reviewer: Manager
   - Counts Toward Promotion: ✅ Yes

9. **Executive Readiness Brief** (L3, Leadership)
   - Pass Threshold: 80% (Executive Approval)
   - Reviewer: Executive
   - Counts Toward Promotion: ✅ Yes

### Operations Track Modules (3)
10. **Driver Onboarding Workflow Mapping** (L2, Ops)
    - Pass Threshold: 80%
    - Reviewer: Manager
    - Artifact Required: Yes
    - Counts Toward Promotion: ✅ Yes

11. **Surge Operations Scenario** (L2, Ops)
    - Pass Threshold: 80%
    - Reviewer: Manager
    - Counts Toward Promotion: ✅ Yes

12. **Safety & Compliance Knowledge Test** (L1, Compliance)
    - Pass Threshold: 90%
    - Reviewer: Auto
    - Counts Toward Promotion: ❌ No (baseline requirement)

### Academic Credit Module (1)
13. **Final Internship Summary & Self-Assessment** (L2, Leadership) - Academic Credit
    - Pass Threshold: 70% (Completion)
    - Reviewer: Manager
    - Counts Toward Promotion: ❌ No

## Key Features

### Promotion Logic
- **Counts Toward Promotion: ✅ Yes** (8 modules)
  - All Technology track modules (3)
  - All Strategy/Ops track modules (3)
  - Operations track modules 9-10 (2)

- **Counts Toward Promotion: ❌ No** (5 modules)
  - Onboarding modules (3)
  - Safety & Compliance (baseline requirement)
  - Academic credit modules (2)

### Reviewer Types
- **Auto**: 1 module (Safety & Compliance)
- **Manager**: 8 modules
- **Executive**: 4 modules (L3 modules)

### Categories Distribution
- **Onboarding**: 3 modules
- **Tech**: 1 module
- **Ops**: 3 modules
- **Leadership**: 3 modules
- **Quality**: 1 module
- **Compliance**: 1 module

### Level Distribution
- **L1**: 4 modules (Onboarding + Compliance)
- **L2**: 4 modules (Operations + Academic)
- **L3**: 5 modules (Technology + Strategy/Ops)

## Verification

After running the migration, verify:

```sql
SELECT 
  COUNT(*) as total_modules,
  COUNT(*) FILTER (WHERE counts_toward_promotion = true) as promotion_modules,
  COUNT(*) FILTER (WHERE counts_toward_promotion = false) as non_promotion_modules,
  COUNT(*) FILTER (WHERE category = 'Onboarding') as onboarding_modules,
  COUNT(*) FILTER (WHERE is_archived = false) as active_modules
FROM public.intern_test_modules;
```

**Expected Results:**
- Total Modules: 13
- Promotion Modules: 8
- Non-Promotion Modules: 5
- Onboarding Modules: 3
- Active Modules: 13

## Next Steps

1. **Run the migration:**
   ```bash
   supabase migration up
   ```

2. **Verify in UI:**
   - Navigate to Intern Program Admin → Test Module Library
   - Confirm all 13 modules appear
   - Verify filters work (Category, Level, Archived)
   - Check that promotion logic is correctly set

3. **Assign to Role Tracks:**
   - Update role tracks to reference these modules in `recommended_test_modules`
   - Technology track should reference modules 3, 4, 5
   - Strategy/Ops track should reference modules 6, 7, 8
   - Operations track should reference modules 9, 10, 11

4. **Update Promotion Rules:**
   - Promotion rules can now reference these real modules
   - Ensure rules check for appropriate categories and levels

## Notes

- All modules start as **Active** (is_archived = false)
- No auto-assignment is configured (modules must be manually assigned)
- Academic credit modules (12, 13) have unlimited retakes
- Module 1 has only 1 retake allowed
- All other modules use default retake limit (3)

## Support

If modules don't appear after migration:
1. Check migration logs for errors
2. Verify table exists: `SELECT * FROM intern_test_modules LIMIT 1;`
3. Check for name conflicts: `SELECT name, COUNT(*) FROM intern_test_modules GROUP BY name HAVING COUNT(*) > 1;`
4. Verify RLS policies allow viewing: Check user roles and permissions


