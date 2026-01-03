# Exit Workflow System - Quick Start Guide

## Where to Start the Firing Process for C-Suite Executives

### Option 1: Company Portal - Governance Admin (PRIMARY LOCATION)
1. Navigate to `/company/governance-admin`
2. Click on **"Exit Workflows"** tab
3. Click **"Initiate Exit Process"** button
4. Select the executive employee
5. Fill in termination details
6. System automatically creates Board resolution for approval

**Why Company Portal?**
- Executive removals are governance matters
- Requires Board approval (resolutions are managed here)
- Aligns with executive appointment process (same location)
- Proper separation: governance functions in Company Portal

### Option 2: Personnel Manager (Redirects to Company Portal)
1. Navigate to `/ceo` → **"Manage People"** tab
2. Find the executive in the employee list
3. Click **"Terminate"** button
4. System detects it's an executive and redirects to Company Portal
5. Complete the process in Governance Admin → Exit Workflows

### Option 3: HR Portal
1. Navigate to `/hr-portal`
2. Click **"Exit Workflows"** tab
3. Click **"Initiate Exit Process"** button
4. Select employee (executives will require Board approval)

---

## Process Flow

### For C-Suite Executives:
1. **Initiate Workflow** → Creates workflow with status `board_approval_pending`
2. **Board Resolution Created** → Automatically generated for Board voting
3. **Board Votes** → Board members vote on resolution in Governance Portal
4. **Approval** → If approved, workflow status changes to `board_approved`
5. **Continue Process** → Access revocation, asset return, final settlement
6. **Complete** → Workflow marked as `completed`

### For Regular Employees:
1. **Initiate Workflow** → Creates workflow with status `initiated`
2. **Send Notice** → Termination notice sent to employee
3. **Revoke Access** → System access revoked
4. **Collect Assets** → Asset return tracked
5. **Final Settlement** → Compensation calculated and payroll processed
6. **Complete** → Workflow marked as `completed`

---

## Features

### ✅ Email Notifications
- Termination notice to employee
- Internal notifications to managers/HR
- Board notifications for executive removals
- Completion notifications

### ✅ Document Generation
- Termination letters (HTML/PDF)
- Final settlement statements
- COBRA notices
- Separation agreements

### ✅ Payroll Integration
- Automatic final compensation calculation
- Payroll record creation
- Severance processing
- PTO payout calculation

### ✅ Access Revocation
- Email forwarding (30 days)
- System access removal
- Building access deactivation
- Financial systems access revocation

### ✅ Asset Tracking
- Default asset checklist
- Return status tracking
- Condition notes
- Custom asset addition

---

## Key Locations

- **Company Portal (PRIMARY)**: `/company/governance-admin` → Exit Workflows tab
- **HR Portal**: `/hr-portal` → Exit Workflows tab
- **Personnel Manager**: `/ceo` → Manage People → Terminate button (redirects to Company Portal for executives)
- **Board Voting**: `/company/governance-admin` → Voting Dashboard

---

## Quick Actions

### Start Executive Removal:
1. Go to **Company Portal** → **Governance Admin** → **Exit Workflows** tab
2. Click "Initiate Exit Process"
3. Select executive
4. Choose termination type (for cause / without cause)
5. Enter reason and grounds (if for cause)
6. Submit → Board resolution created automatically

### View Workflow Progress:
1. Go to Exit Workflows tab
2. Click "View Details" on any workflow
3. See step-by-step progress
4. Complete pending steps

### Process Final Settlement:
1. Open workflow details
2. Go to "Final Settlement" tab
3. Enter severance months (if applicable)
4. Click "Calculate Final Compensation"
5. Review breakdown
6. Click "Save Final Settlement"
   - Automatically processes payroll
   - Generates termination letter
   - Sends email notification
   - Creates settlement statement

---

## System Integration

- **Board Resolutions**: Automatically created for executives
- **Payroll System**: Final pay automatically processed
- **Email System**: Notifications sent at key stages
- **Document System**: Letters and statements generated
- **Audit Trail**: All actions logged

---

**Need Help?** Contact HR or check the Executive Removal Process document in `/public/lib/governance/documents/`

