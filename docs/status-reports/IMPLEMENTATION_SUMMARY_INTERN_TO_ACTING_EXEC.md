# Intern → Acting Executive Conversion System - Implementation Summary

## Overview

This implementation adds a complete promotion workflow system for converting interns to acting executives, including state machine management, eligibility gates, document generation, and approval workflows.

## Files Created

### 1. Database Migrations

#### `supabase/migrations/20250216000001_create_intern_to_acting_exec_conversion_system.sql`
- Creates all necessary tables:
  - `roles_catalog`: Reference data for role tiers and defaults
  - `promotion_engagements`: Tracks person's journey through promotion stages
  - `promotion_performance_reviews`: Stores performance reviews with ratings and recommendations
  - `promotion_comp_packages`: Compensation package details (deferred salary, equity)
  - `promotion_documents`: Generated conversion letters and documents
  - `promotion_approvals`: Approval workflow tracking (CEO, CFO, CTO, BOARD)

#### `supabase/migrations/20250216000002_insert_acting_exec_conversion_template.sql`
- Inserts the HTML template for the conversion letter into `document_templates`
- Template uses `{{PLACEHOLDER}}` syntax compatible with existing `renderDocumentHtml` utility
- Includes all 33 placeholders from the original specification

### 2. React Components

#### `src/components/executive/PromotionWizard.tsx`
- Multi-step form for generating conversion letters
- Fields for:
  - New title and department
  - Reporting structure
  - Authority scope
  - Performance objectives (90-day, deliverables, KPIs)
  - Deferred salary terms
  - Equity eligibility
  - Acting term dates
- Preview functionality
- Submits document for CEO approval

#### `src/components/executive/PromotionCandidateProfile.tsx`
- Candidate profile view showing:
  - Current stage and title
  - Eligibility status
  - Performance history (placeholder for future implementation)
  - Promotion wizard trigger
- Uses tabs for organization

### 3. Utility Functions

#### `src/utils/promotionEligibility.ts`
- `checkActingExecEligibility()`: Validates intern → acting exec promotion
  - Checks current stage is `INTERN_ACTIVE`
  - Validates performance rating >= 80
  - Checks recommendation is `PROMOTE_ACTING`
  - Verifies deliverables are complete
- `checkPermanentExecEligibility()`: Validates acting → permanent exec promotion
- `checkTitleCollision()`: Prevents duplicate executive titles
- `suggestTitleVariations()`: Provides non-colliding title options

## Key Features

### State Machine
Stages tracked in `promotion_engagements.current_stage`:
- `APPLIED` → `INTERN_ACTIVE` → `ACTING_ELIGIBLE` → `ACTING_ACTIVE` → `EXEC_ELIGIBLE` → `EXEC_ACTIVE` → `EXITED`

### Eligibility Gates

**Intern → Acting Executive:**
- Current stage must be `INTERN_ACTIVE`
- Latest performance review rating >= 80
- Recommendation must be `PROMOTE_ACTING`
- Deliverables checklist complete

**Acting → Permanent Executive:**
- Current stage must be `ACTING_ACTIVE`
- Acting term completed
- Average performance rating meets threshold
- All reviews recommend promotion

### Document Generation
- Uses existing `renderDocumentHtml()` utility from `templateUtils.ts`
- Template stored in `document_templates` with key `acting_exec_conversion_letter`
- Automatically fills all 33 placeholders from engagement and form data
- Generates HTML that can be converted to PDF

### Approval Workflow
- Documents require CEO approval by default
- Can add CFO, CTO, or BOARD approvals as needed
- Approval status tracked in `promotion_approvals` table

## Integration Points

### With Existing Systems

1. **Employees Table**: `person_id` in `promotion_engagements` references `employees.id`
2. **Company Settings**: Pulls CEO name, company name from `company_settings` table
3. **Document Templates**: Uses existing `document_templates` table and rendering system
4. **Authentication**: Uses existing RLS policies and `exec_users` table for permissions

### How to Use

1. **Create an Engagement**:
   ```sql
   INSERT INTO promotion_engagements (person_id, current_stage, current_title, track)
   VALUES ('person-uuid', 'INTERN_ACTIVE', 'Intern', 'Technology');
   ```

2. **Add Performance Review**:
   ```sql
   INSERT INTO promotion_performance_reviews (engagement_id, rating, recommendation, deliverables_complete, period_start, period_end)
   VALUES ('engagement-uuid', 85, 'PROMOTE_ACTING', true, '2024-01-01', '2024-03-31');
   ```

3. **Use Promotion Wizard**:
   - Navigate to candidate profile
   - Check eligibility (automatically validated)
   - Click "Generate Conversion Letter"
   - Fill in form details
   - Preview and submit for approval

4. **Approve Document**:
   - CEO receives notification (to be integrated with your notification system)
   - Approve via approval interface
   - Document status updates to `PENDING_SIGNATURE`

## Next Steps / Future Enhancements

1. **Performance Review UI**: Build UI for creating/managing performance reviews
2. **Approval Interface**: Create CEO portal component for reviewing/approving documents
3. **Email Notifications**: Integrate with your email system to notify approvers
4. **PDF Generation**: Convert HTML to PDF and store in Supabase Storage
5. **Signature Flow**: Integrate with existing document signing system
6. **Dashboard**: Create overview dashboard showing all candidates in promotion pipeline
7. **Candidate List View**: Build list view of all engagements with filters

## Testing Checklist

- [ ] Run database migrations
- [ ] Verify template inserted correctly
- [ ] Create test engagement record
- [ ] Test eligibility checking
- [ ] Test PromotionWizard form submission
- [ ] Verify document generation
- [ ] Test approval workflow
- [ ] Verify RLS policies work correctly

## Notes

- The system is designed to be flexible - you can adjust thresholds and requirements in `promotionEligibility.ts`
- RLS policies allow executives to manage all promotion data, while candidates can view their own
- The template uses the same placeholder replacement system as your existing executive documents
- All dates use ISO format for consistency

