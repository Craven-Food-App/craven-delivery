# Company Portal Workflow Wizards

This directory contains all the step-by-step wizard components for the Company Portal workflows.

## Architecture

### Shared Components

- **`shared/WizardLayout.tsx`** - Reusable wizard shell component with progress tracking, stepper, and navigation
- **`shared/useWizard.ts`** - Custom hook for wizard state management (active step, validation, navigation)
- **`shared/useAutoAdvance.ts`** - Hook for automatically advancing steps when conditions are met

### Status Management

- **`../../lib/governance/StatusManager.ts`** - Unified status synchronization system that keeps all governance systems in sync

## Available Wizards

### 1. Executive Appointment Wizard
**File:** `ExecutiveAppointmentWizard.tsx`  
**Route:** `/company/governance-admin/appointments/new`  
**Steps:**
1. Basic Information (name, email, title)
2. Appointment Details (dates, term, authority)
3. Compensation (salary, bonuses, benefits)
4. Equity Grant (optional)
5. Additional Details (formation mode, notes)
6. Review & Submit

### 2. Board Resolution Wizard
**File:** `BoardResolutionWizard.tsx`  
**Route:** Governance Admin → "Create Resolution" tab  
**Steps:**
1. Resolution Type
2. Resolution Details (title, description)
3. Link Appointment (if applicable)
4. Dates (meeting date, effective date)
5. Review & Submit

### 3. Equity Grant Wizard
**File:** `EquityGrantWizard.tsx`  
**Route:** Governance Admin → "Equity Grants" tab  
**Steps:**
1. Recipient (email search)
2. Grant Details (shares, share class)
3. Vesting Schedule (type, period, cliff)
4. Dates & Resolution (start date, optional resolution link)
5. Review & Submit

### 4. Officer Validation Wizard
**File:** `OfficerValidationWizard.tsx`  
**Route:** Governance Admin → "Validation" tab  
**Steps:**
1. Select Appointment
2. Review Documents (view all signed documents)
3. Validation Checklist (identity, background, board approval, documents)
4. Notes & Approval

### 5. Document Signing Wizard
**File:** `DocumentSigningWizard.tsx`  
**Route:** Executives → Onboarding Packet  
**Steps:**
1. Overview (progress, document list)
2. Sign Documents (one-by-one signing)
3. Completion (all documents signed)

### 6. Exit Workflow Wizard
**File:** `ExitWorkflowWizard.tsx`  
**Route:** Governance Admin → "Exit Workflows" tab  
**Steps:**
1. Select Employee
2. Termination Details (type, date, reason)
3. Board Approval (for executives)
4. Final Settlement (compensation, equity)
5. Review & Submit

## Auto-Advance System

The auto-advance system allows wizards to automatically progress to the next step when certain conditions are met. This is useful for:

- **Board Resolutions:** Auto-advance after voting completes
- **Appointments:** Auto-advance after board approval
- **Document Signing:** Auto-advance after each signature
- **Exit Workflows:** Auto-advance after each step completes

### Usage Example

```typescript
import { useAutoAdvance, AutoAdvanceConditions } from './shared/useAutoAdvance';

useAutoAdvance(wizard.activeStep, {
  enabled: true,
  checkInterval: 5000, // Check every 5 seconds
  onAdvance: (nextStep) => {
    wizard.goToStep(nextStep);
  },
  conditions: [
    {
      step: 2,
      check: async () => {
        return await AutoAdvanceConditions.checkResolutionAdopted(resolutionId);
      },
      description: 'Board resolution adopted',
    },
  ],
});
```

## Status Synchronization

The `StatusManager` provides unified status synchronization across all governance systems:

- **Governance Resolutions** ↔ **Board Resolutions**
- **Resolutions** ↔ **Appointments**
- **Resolutions** ↔ **Exit Workflows**

### Usage

```typescript
import { syncAllStatuses } from '@/lib/governance/StatusManager';

// After a resolution status changes
await syncAllStatuses(resolutionId, 'ADOPTED');
```

## Best Practices

1. **Validation:** Always validate steps before allowing advancement
2. **Error Handling:** Provide clear error messages to users
3. **Progress Tracking:** Show visual progress indicators
4. **Auto-Advance:** Use sparingly and only when conditions are clear
5. **Status Sync:** Always sync statuses after state changes

## Future Enhancements

- [ ] Real-time updates via Supabase subscriptions
- [ ] Email notifications at each step
- [ ] Audit logging for all wizard actions
- [ ] Undo/redo functionality
- [ ] Save draft functionality
- [ ] Collaborative editing (multiple users)








