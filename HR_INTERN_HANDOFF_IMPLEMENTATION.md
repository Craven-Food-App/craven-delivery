# HR → Intern Program Handoff System - Implementation Summary

## Overview

This document describes the complete implementation of the HR → Intern Program handoff system, which provides a single, authoritative handoff from HR/Recruiting into the Intern Program system.

## Key Features

### 1. **Non-Negotiable Trigger**
- **Only** candidates with `hr_status = 'Accepted'` AND `start_date` set will trigger enrollment
- All other statuses are ignored
- Automatic enrollment via database trigger

### 2. **Complete Data Contract**
- Validates all required fields (first_name, last_name, email, track, start_date)
- Validates track exists in role tracks
- Validates manager/sponsor exist (if provided)
- Checks for duplicate active enrollments
- Email uniqueness validation

### 3. **Automatic Enrollment Process**
When a candidate is marked as "Accepted" with a start date:
1. Creates/updates employee record
2. Creates promotion_engagement with `INTERN_ACTIVE` stage
3. Assigns mandatory onboarding tests from role track
4. Grants INTERN portal access only (no admin/finance/production access)
5. Creates immutable audit log entry
6. Sends welcome email to intern

### 4. **Prohibitions Enforced**
- ❌ Intern Program Admin cannot create interns
- ❌ Intern Manager cannot create interns
- ❌ Executive Sponsor cannot create interns
- ❌ Manual overrides without audit log
- ✅ All intern entries must originate from HR

## Database Schema

### Table: `hr_intern_candidates`
Stores all intern candidates from HR/Recruiting system.

**Key Fields:**
- `hr_status`: Status in HR system (Draft, Interviewed, Offered, Accepted, etc.)
- `handoff_status`: Enrollment status (Pending, Enrolled, Failed, Blocked)
- `track`: Career track (Technology, Strategy/Ops, Operations, Marketing)
- `start_date`: Program start date (required for enrollment)

**Status Flow:**
```
Draft → Interviewed → Offered → Accepted (triggers enrollment)
                                    ↓
                            Withdrawn / Terminated (blocks enrollment)
```

### Functions

1. **`validate_hr_handoff_payload(p_candidate_id)`**
   - Validates all required fields
   - Checks track existence
   - Validates manager/sponsor
   - Checks for duplicate enrollments

2. **`enroll_intern_from_hr_handoff(p_candidate_id)`**
   - Core enrollment logic
   - Creates all required records
   - Assigns tests
   - Grants permissions
   - Logs audit entry

3. **`manual_hr_handoff(p_candidate_id)`**
   - Allows admin to manually trigger handoff
   - Only works if status is "Accepted" with start_date

4. **`get_hr_handoff_status(p_candidate_id)`**
   - Returns current handoff status
   - Includes employee_id and engagement_id if enrolled

### Triggers

**`trigger_hr_status_change`**
- Automatically fires on INSERT or UPDATE of `hr_status` or `start_date`
- Only processes when `hr_status = 'Accepted'` AND `start_date IS NOT NULL`
- Blocks enrollment if status is "Withdrawn" or "Terminated (Pre-start)"

## API Endpoints

### Supabase Edge Function: `hr-intern-handoff`

**POST** - Submit candidate for handoff
```json
{
  "person": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "location": "San Francisco, CA",
    "phone": "+1234567890"
  },
  "employment": {
    "role_type": "INTERN",
    "track": "Technology",
    "start_date": "2025-03-01",
    "manager_id": "uuid",
    "sponsor_id": "uuid"
  },
  "program": {
    "initial_role_state": "INTERN_ACTIVE",
    "source": "HR_HANDOFF"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Intern successfully enrolled in program",
  "candidate_id": "uuid",
  "employee_id": "uuid",
  "engagement_id": "uuid",
  "handoff_status": "Enrolled"
}
```

**GET** - Get handoff status
```
GET /hr-intern-handoff?candidate_id=uuid
```

## Frontend Components

### HR Portal - Intern Candidates Tab

**Location:** `src/components/hr/InternCandidateManagement.tsx`

**Features:**
- View all intern candidates
- Filter by HR status and handoff status
- Search by name or email
- Add new candidates
- Retry failed handoffs
- View enrollment errors
- Statistics dashboard

**Access:** HR Portal → Intern Candidates tab

## Email Notifications

### Enrollment Email

**Function:** `send-intern-enrollment-email`

**Triggers:** Automatically when handoff status becomes "Enrolled"

**Content:**
- Welcome message
- Program details (track, start date, engagement ID)
- Portal access link
- Next steps

## Audit Logging

All handoff actions are logged in `intern_program_audit_log`:
- **Action:** `INTERN_ENROLLED`
- **Source:** `HR_HANDOFF`
- **Actor:** HR user who created candidate
- **Entity:** engagement_id
- **Reason:** Includes candidate_id and handoff details
- **Immutable:** Cannot be edited or deleted

## Error Handling

### Validation Errors
- Missing required fields
- Invalid track
- Invalid manager/sponsor ID
- Duplicate active enrollment
- User account doesn't exist

### Enrollment Errors
- Database constraint violations
- Foreign key failures
- Permission errors
- Test assignment failures

All errors are:
1. Logged in `handoff_error` field
2. Set `handoff_status` to "Failed"
3. Returned in API response
4. Visible in HR portal UI

## Testing Checklist

- [ ] Create candidate with "Draft" status → No enrollment
- [ ] Create candidate with "Accepted" but no start_date → No enrollment
- [ ] Create candidate with "Accepted" and start_date → Automatic enrollment
- [ ] Update candidate to "Accepted" with start_date → Triggers enrollment
- [ ] Update candidate to "Withdrawn" → Blocks enrollment
- [ ] Duplicate email enrollment → Fails validation
- [ ] Invalid track → Fails validation
- [ ] Invalid manager_id → Fails validation
- [ ] Manual handoff retry → Works for failed enrollments
- [ ] Email notification → Sent on successful enrollment
- [ ] Audit log → Created for all enrollments
- [ ] Portal access → INTERN role granted only

## Security

### Access Control
- Only users with `hr`, `admin`, `ceo`, or `INTERN_PROGRAM_ADMIN` roles can manage candidates
- RLS policies enforce access restrictions
- All functions use `SECURITY DEFINER` for proper permissions

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate status values
- Unique constraints prevent duplicate enrollments
- Immutable audit logs for compliance

## Future Enhancements

1. **Background Check Integration**
   - Auto-update status when background check completes
   - Block enrollment if background check fails

2. **Offer Letter Generation**
   - Auto-generate offer letters from templates
   - Track offer acceptance

3. **Onboarding Checklist**
   - Auto-create onboarding tasks
   - Track completion status

4. **Manager Notifications**
   - Notify manager when intern is enrolled
   - Send onboarding guide

5. **Bulk Import**
   - CSV import for multiple candidates
   - Batch processing

## Files Created/Modified

### Database
- `supabase/migrations/20250218000000_create_hr_intern_handoff_system.sql`

### Edge Functions
- `supabase/functions/hr-intern-handoff/index.ts`
- `supabase/functions/send-intern-enrollment-email/index.ts`

### Frontend
- `src/components/hr/InternCandidateManagement.tsx`
- `src/pages/HRPortal.tsx` (modified)

## Support

For issues or questions:
1. Check audit logs in Intern Program Admin → Audit Log
2. Review handoff_status and handoff_error in HR portal
3. Check database logs for trigger execution
4. Verify user permissions and RLS policies


