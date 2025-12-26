# Crave'n Inc. + Moov Merchant Onboarding Process
## End-to-End Guide

**Document Version:** 1.0  
**Last Updated:** December 24, 2024  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Process Flow Diagram](#process-flow-diagram)
3. [Phase 1: Initial Registration & Qualification](#phase-1-initial-registration--qualification)
4. [Phase 2: Restaurant Onboarding Wizard](#phase-2-restaurant-onboarding-wizard)
5. [Phase 3: Admin Review & Verification](#phase-3-admin-review--verification)
6. [Phase 4: Moov Payment Account Setup](#phase-4-moov-payment-account-setup)
7. [Phase 5: Activation & Go-Live](#phase-5-activation--go-live)
8. [Status Tracking & Monitoring](#status-tracking--monitoring)
9. [Troubleshooting & Support](#troubleshooting--support)

---

## Overview

The Crave'n Inc. merchant onboarding process is a comprehensive, multi-phase system designed to onboard restaurants efficiently while ensuring compliance, security, and operational readiness. The process integrates with Moov's hosted onboarding system for payment processing setup, providing a seamless merchant experience.

### Key Features

- **5-Step Guided Wizard** - Step-by-step onboarding interface
- **Admin Review System** - Internal verification and approval workflow
- **Moov Integration** - Secure payment processing account setup
- **Progress Tracking** - Real-time status monitoring
- **Document Verification** - Secure document upload and review
- **Flexible Workflow** - Merchants can complete steps at their own pace

### Timeline Overview

| Phase | Duration | Completion Required |
|-------|----------|---------------------|
| Phase 1: Registration | 5-10 minutes | Required |
| Phase 2: Onboarding Wizard | 30-60 minutes | Required |
| Phase 3: Admin Review | 1-3 business days | Required |
| Phase 4: Moov Setup | 10-15 minutes | Required for payments |
| Phase 5: Activation | Immediate | Automatic upon completion |

**Total Estimated Time:** 2-4 business days (depending on admin review)

---

## Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MERCHANT ONBOARDING FLOW                     │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Registration
  │
  ├─> Merchant creates account
  ├─> Email verification
  └─> Redirected to onboarding wizard
           │
           ▼
Phase 2: Onboarding Wizard (5 Steps)
  │
  ├─> Step 1: Order Method Selection
  ├─> Step 2: Store Hours Configuration
  ├─> Step 3: Menu Setup
  ├─> Step 4: Pricing Plan Selection
  └─> Step 5: Banking/Payout Information (Basic Info Collection)
           │
           ▼
Phase 3: Admin Review
  │
  ├─> Business information verification
  ├─> Document review (business license, insurance, health permit)
  ├─> Menu approval
  └─> Admin approval/rejection
           │
           ▼
Phase 4: Moov Payment Setup
  │
  ├─> Merchant accesses Moov onboarding from Merchant Portal
  ├─> Redirected to Moov hosted onboarding form
  ├─> Completes Moov account setup
  └─> Returns to portal with verified account
           │
           ▼
Phase 5: Activation
  │
  ├─> All requirements met
  ├─> Restaurant activated
  └─> Merchant can accept orders
```

---

## Phase 1: Initial Registration & Qualification

### Step 1.1: Account Creation

**Location:** `/restaurant/register` or `/restaurant/auth`

**Process:**

1. Merchant navigates to restaurant registration page
2. Creates account using email and password
3. Email verification sent automatically
4. Merchant verifies email address
5. System checks if restaurant already exists for user
   - If exists: Redirects to Merchant Portal
   - If new: Proceeds to onboarding wizard

**Required Information:**
- Email address
- Password (minimum security requirements)
- Email verification

**Duration:** 5-10 minutes

### Step 1.2: Initial Qualification Check

**Automatic Verification:**
- User authentication status
- Email verification status
- Existing restaurant check

**Outcome:**
- ✅ Proceed to onboarding wizard
- ⏭️ Skip to Merchant Portal (if restaurant exists)

---

## Phase 2: Restaurant Onboarding Wizard

**Location:** `/restaurant/register` (onboarding wizard)

**Interface:** Multi-step wizard with sidebar navigation and progress tracking

**Save Functionality:** Progress automatically saved to localStorage, can be resumed later

### Step 2.1: Order Method Selection

**Component:** `OrderMethodStep`

**Purpose:** Determine how the restaurant will receive and process orders

**Information Collected:**
- Order methods (delivery, pickup, dine-in)
- POS system integration preferences
- Expected monthly order volume
- Restaurant type (full-service, fast-casual, etc.)

**Required Fields:**
- Order method selection
- Restaurant type
- Expected monthly orders
- POS system (if applicable)

**Validation:**
- At least one order method must be selected
- Expected monthly orders must be numeric

**Next Action:** Proceed to Store Hours configuration

---

### Step 2.2: Store Hours Configuration

**Component:** `StoreHoursStep`

**Purpose:** Define operating hours for each day of the week

**Information Collected:**
- Hours for each day (Monday-Sunday)
- Open/closed status per day
- Special hours (holidays, seasonal)

**Required Fields:**
- Store hours for each day
- Open/close times

**Format:**
- Time format: HH:MM (24-hour)
- Example: `09:00` to `22:00`

**Features:**
- Quick set for all days
- Individual day customization
- Closed day option
- Validation for logical times (close after open)

**Next Action:** Proceed to Menu Setup

---

### Step 2.3: Menu Setup

**Component:** `MenuBuilderStep`

**Purpose:** Configure restaurant menu items, categories, and pricing

**Information Collected:**
- Menu categories
- Menu items with descriptions
- Item pricing
- Item availability
- Dietary information (if applicable)
- Menu images

**Setup Options:**
1. **Manual Entry** - Build menu from scratch in the wizard
2. **PDF Upload** - Upload existing menu PDF for admin processing
3. **Import** - Import from another system (future feature)

**Required Fields:**
- At least one menu category
- At least one menu item
- Pricing for all items

**Menu Builder Features:**
- Drag-and-drop category ordering
- Rich text descriptions
- Image upload for items
- Availability toggle per item
- Pricing management
- Modifier groups (future)

**Validation:**
- Must have at least one category
- Must have at least one item
- All items must have prices
- Prices must be positive numbers

**Next Action:** Proceed to Pricing Plan selection

---

### Step 2.4: Pricing Plan Selection

**Component:** `PricingPlanStep`

**Purpose:** Select commission tier and pricing structure

**Information Collected:**
- Commission tier selection
- Pricing plan details
- Expected transaction volume
- Fee structure acceptance

**Available Tiers:**
- Basic Tier
- Standard Tier
- Premium Tier
- Enterprise Tier (custom)

**Displayed Information:**
- Commission percentage per tier
- Transaction fees
- Monthly minimums (if applicable)
- Features included in each tier

**Required Fields:**
- Commission tier selection
- Terms acceptance

**Next Action:** Proceed to Banking/Payout Information

---

### Step 2.5: Banking/Payout Information

**Component:** `EnhancedBankingStep`

**Purpose:** Collect basic banking and business information for initial setup. Full payment processing setup with Moov will be completed after admin approval.

**Information Collected:**
- Bank account type (checking/savings)
- Routing number
- Account number
- Business information for compliance
- Legal business name
- Business type
- Owner information

**Note:** This step collects basic banking information. Secure payment processing account setup with Moov will be completed in Phase 4 after the restaurant is approved.

**Required Fields:**
- Bank account type
- Routing number (9 digits, validated)
- Account number
- Account number confirmation
- Business legal name
- Date of birth (for verification)
- Legal name
- Business type
- Location count

**Validation:**
- Routing number must be valid 9-digit US routing number
- Account numbers must match
- Routing number validation algorithm applied

**Security:**
- Account numbers encrypted in database
- Information used for Moov onboarding after approval
- PCI compliance maintained through Moov integration

**Next Action:** Complete wizard and proceed to admin review

---

### Step 2.6: Wizard Completion

**Actions:**
1. All required fields validated
2. Progress saved to database
3. Restaurant record created with status: `pending`
4. Phone number verification prompt (if not provided)
5. Redirect to Merchant Portal

**Phone Number Verification:**
- Modal prompt if phone number missing
- SMS verification code sent
- Optional "Remind Later" option
- Reminder modal shown next session if skipped

**Database Records Created:**
- `restaurants` table entry
- `restaurant_onboarding` table entry
- Status set to: `pending`

**Notification:**
- Welcome email sent to merchant
- Admin notification of new application
- Merchant redirected to Merchant Portal

---

## Phase 3: Admin Review & Verification

**Location:** Admin Portal → Restaurant Onboarding

**Duration:** 1-3 business days (typically)

### Step 3.1: Application Submission

**Automatic Actions:**
- Restaurant record created with `onboarding_status: 'pending'`
- `restaurant_onboarding` record created
- Admin notification sent
- Application appears in admin dashboard

**Merchant Portal Status:**
- Merchant sees "Under Review" status
- Access to Merchant Portal granted (limited features)
- Can edit some information
- Cannot accept orders until approved

---

### Step 3.2: Admin Review Process

**Admin Actions:**

1. **Initial Review**
   - Review restaurant information
   - Check business details completeness
   - Verify contact information

2. **Document Verification**
   - Review business license
   - Verify insurance certificate
   - Check health permit
   - Verify owner identification
   - Validate EIN/Tax ID

3. **Menu Review**
   - Review menu items and pricing
   - Verify menu completeness
   - Check for inappropriate content
   - Validate pricing structure

4. **Business Information Verification**
   - Verify business name matches legal documents
   - Confirm business type (LLC, Corporation, etc.)
   - Validate business address
   - Check business registration status

5. **Assignment (Optional)**
   - Assign to specific admin team member
   - Add admin notes
   - Set priority level

**Admin Tools:**
- Kanban board view
- Detailed restaurant profile
- Document viewer
- Communication tools
- Status update interface

---

### Step 3.3: Verification Outcomes

**Approval:**
- Business information marked as verified
- `business_info_verified: true`
- `business_verified_at` timestamp set
- Merchant notified of approval
- Proceeds to next phase

**Rejection:**
- `onboarding_status: 'rejected'`
- Rejection reason provided
- Merchant notified with details
- Merchant can address issues and resubmit

**Needs Information:**
- `onboarding_status: 'needs_info'`
- Admin notes added
- Specific requirements listed
- Merchant notified of missing information
- Merchant can update and resubmit

**Menu Status:**
- `menu_preparation_status: 'not_started' | 'in_progress' | 'ready'`
- Admin can update menu status
- Merchant can continue working on menu

---

### Step 3.4: Pre-Go-Live Requirements

**All Required Before Go-Live:**

1. ✅ Business information verified
2. ✅ Documents approved
3. ✅ Menu marked as ready
4. ✅ Moov payment account setup complete
5. ✅ Store hours configured
6. ✅ Contact information verified

**Database Status Updates:**
- `business_info_verified: true`
- `menu_preparation_status: 'ready'`
- `moov_onboarding_complete: true`
- `moov_account_id` present
- `go_live_ready: true` (when all requirements met)

---

## Phase 4: Moov Payment Account Setup

**Location:** Merchant Portal → Settings → Bank Account → Moov Account Setup

**When:** Can be completed at any time after initial onboarding, but required before accepting orders

**Integration Type:** Moov Hosted Onboarding (co-branded form)

---

### Step 4.1: Accessing Moov Onboarding

**Entry Points:**

1. **Home Dashboard Alert**
   - Alert shown if `moov_onboarding_complete: false`
   - "Moov Account Setup Required" message
   - Direct link to setup

2. **Bank Account Settings**
   - Settings → Bank Account tab
   - Moov Onboarding Card visible
   - Status badge shows current state

3. **Direct Navigation**
   - `/merchant-portal?tab=settings&subtab=bank-account`

**Prerequisites:**
- Restaurant record must exist
- User must be authenticated
- Restaurant must be owned by current user

---

### Step 4.2: Creating Moov Onboarding Invite

**Process:**

1. Merchant clicks "Start Moov Onboarding" button
2. System calls `create-moov-onboarding-invite` edge function
3. Edge function:
   - Fetches restaurant data
   - Pre-fills merchant information from restaurant record
   - Generates onboarding invite via Moov API
   - Stores invite code in database
   - Sets `moov_onboarding_status: 'pending'`
   - Returns onboarding link

**Pre-filled Information (if available):**
- Business legal name
- DBA name
- Business address
- Contact phone
- Contact email
- Business type
- Industry codes (if applicable)

**Configuration:**
- **Capabilities:** `wallet.balance`, `collect-funds.ach`, `collect-funds.card-payments`, `send-funds.ach`
- **Scopes:** `accounts.read`
- **Fee Plan Code:** Configured per merchant (default: `merchant-direct`)
- **Account Type:** `business`
- **Mode:** `production`

**Return URLs:**
- **Return URL:** `/merchant-portal?tab=settings&subtab=bank-account&moov_onboarding=complete`
- **Terms of Service URL:** `/terms-of-service`

---

### Step 4.3: Moov Hosted Onboarding Experience

**Merchant Experience:**

1. **Redirect to Moov**
   - Merchant redirected to Moov's hosted onboarding form
   - Co-branded with Crave'n Inc. branding
   - Secure session created

2. **Account Creation**
   - Merchant creates Moov account (if new)
   - Grants permissions to Crave'n Inc.
   - Reviews pricing disclosure
   - Accepts Moov platform agreement

3. **Business Information**
   - Reviews pre-filled information
   - Completes any missing fields
   - Verifies business details
   - Uploads required documents

4. **Owners & Control Officers**
   - For business accounts: adds owners
   - Adds control officers
   - Uploads identification documents
   - Provides tax information

5. **Bank Account Setup**
   - Connects bank account
   - Verifies account ownership
   - Sets up payout preferences

6. **Document Upload**
   - Business license
   - Tax documents (W-9, EIN verification)
   - Identification documents
   - Additional verification documents as required

**Features:**
- Save and resume later
- Mobile-responsive interface
- Secure document upload
- Real-time validation
- Progress tracking

**Duration:** 10-15 minutes (depending on complexity)

---

### Step 4.4: Onboarding Completion

**Completion Process:**

1. **Moov Processing**
   - Moov reviews submitted information
   - Performs compliance checks
   - Verifies documents
   - Activates account

2. **Webhook Notification** (if configured)
   - Moov sends webhook event
   - `moov-webhook` edge function processes event
   - Updates restaurant record:
     - `moov_account_id`
     - `moov_onboarding_status: 'completed'`
     - `moov_onboarding_complete: true`
     - `moov_capabilities`
     - `moov_fee_plan_codes`

3. **Return to Portal**
   - Merchant redirected back to Merchant Portal
   - URL includes `?moov_onboarding=complete` parameter
   - Component detects return
   - Automatically checks status after 2-second delay

4. **Status Update**
   - MoovOnboardingCard refreshes status
   - Shows "Completed" badge
   - Displays account ID (masked)
   - Success message shown

**Database Updates:**
```sql
UPDATE restaurants SET
  moov_account_id = 'account_id_from_moov',
  moov_onboarding_status = 'completed',
  moov_onboarding_complete = true,
  moov_capabilities = ['wallet.balance', 'collect-funds.ach', ...],
  moov_fee_plan_codes = ['merchant-direct'],
  updated_at = NOW()
WHERE id = 'restaurant_id';
```

---

### Step 4.5: Onboarding Status States

**Possible States:**

1. **Not Started** (default)
   - No onboarding invite created
   - Status: `null` or not set
   - UI: "Start Moov Onboarding" button

2. **Pending**
   - Invite created, merchant in process
   - Status: `moov_onboarding_status: 'pending'`
   - UI: "Onboarding In Progress" message
   - Actions: "Continue Setup" or "Check Status"

3. **Completed** ✅
   - Onboarding successfully finished
   - Status: `moov_onboarding_status: 'completed'`
   - `moov_onboarding_complete: true`
   - `moov_account_id` present
   - UI: Green success card with account ID

4. **Revoked**
   - Invite revoked by admin or expired
   - Status: `moov_onboarding_status: 'revoked'`
   - UI: Warning badge, option to create new invite

5. **Failed**
   - Onboarding failed or rejected
   - Status: `moov_onboarding_status: 'failed'`
   - UI: Error badge, option to retry

---

## Phase 5: Activation & Go-Live

### Step 5.1: Go-Live Requirements Checklist

**All requirements must be met:**

- [ ] Business information verified by admin
- [ ] Documents approved (business license, insurance, health permit)
- [ ] Menu marked as ready
- [ ] Store hours configured
- [ ] Contact information verified
- [ ] Moov account setup complete
- [ ] Moov onboarding status: `completed`
- [ ] Admin approval granted
- [ ] `go_live_ready: true` in database

**Payment Processing:**
- Moov is the primary and only payment processing provider
- Moov account must be fully onboarded and verified
- Banking information collected in onboarding wizard is used for Moov setup

**Minimum Requirements:**
- Moov payment account must be configured and verified
- Banking information must be complete
- Payout account must be verified through Moov

---

### Step 5.2: Activation Process

**Automatic Activation:**
- System checks all requirements
- Sets `is_active: true` when all met
- Updates `go_live_ready: true`
- Activates restaurant in system

**Admin Activation:**
- Admin can manually activate restaurant
- Admin can set `is_active: true`
- Admin can override requirements (with notes)

**Database Update:**
```sql
UPDATE restaurants SET
  is_active = true,
  go_live_ready = true,
  onboarding_status = 'approved',
  activated_at = NOW()
WHERE id = 'restaurant_id'
AND business_info_verified = true
AND menu_preparation_status = 'ready'
AND moov_onboarding_complete = true
AND moov_account_id IS NOT NULL;
```

---

### Step 5.3: Post-Activation

**Immediate Capabilities:**
- Restaurant appears in customer app
- Can receive orders
- Orders appear in Merchant Portal
- Payment processing active
- Payouts enabled

**Notifications:**
- Merchant receives "Go Live" email
- Welcome email with next steps
- Training resources provided
- Support contact information

**Merchant Portal Access:**
- Full access to all features
- Order management dashboard
- Menu management
- Settings and configuration
- Financials and reports
- Analytics and insights

---

## Status Tracking & Monitoring

### Merchant Portal Status Indicators

**Home Dashboard:**
- Incomplete tasks alert
- Moov onboarding status
- Menu readiness
- Overall readiness score

**Settings → Bank Account:**
- Moov Onboarding Card (primary)
- Verification status
- Account details
- Legacy Stripe Connect section (hidden by default, for existing merchants only)

### Database Status Fields

**Restaurants Table:**
```sql
-- Onboarding Status
onboarding_status: 'pending' | 'approved' | 'rejected' | 'needs_info'

-- Moov Payment Status (Primary)
moov_account_id: text
moov_onboarding_status: 'pending' | 'completed' | 'revoked' | 'failed'
moov_onboarding_complete: boolean
moov_capabilities: jsonb
moov_fee_plan_codes: text[]

-- Legacy Stripe Status (for existing merchants only)
stripe_connect_account_id: text (deprecated)
stripe_onboarding_complete: boolean (deprecated)
stripe_charges_enabled: boolean (deprecated)
stripe_payouts_enabled: boolean (deprecated)

-- Activation Status
is_active: boolean
go_live_ready: boolean
business_info_verified: boolean (via restaurant_onboarding)
```

**Restaurant Onboarding Table:**
```sql
-- Review Status
business_info_verified: boolean
menu_preparation_status: 'not_started' | 'in_progress' | 'ready'
go_live_ready: boolean
assigned_admin_id: uuid

-- Timestamps
business_verified_at: timestamp
menu_ready_at: timestamp
created_at: timestamp
updated_at: timestamp
```

---

## Troubleshooting & Support

### Common Issues

#### Issue: Moov Onboarding Link Not Creating

**Symptoms:**
- Error when clicking "Start Moov Onboarding"
- "Failed to create onboarding link" message

**Solutions:**
1. Verify Moov API credentials are set in Supabase secrets
2. Check edge function logs for specific errors
3. Ensure restaurant record exists and is valid
4. Verify fee plan codes are correct
5. Check Moov API status

**Edge Function:** `create-moov-onboarding-invite`

---

#### Issue: Status Not Updating After Return

**Symptoms:**
- Return from Moov but status still shows "Pending"
- Account ID not appearing

**Solutions:**
1. Click "Refresh Status" button manually
2. Check database for `moov_account_id` value
3. Verify webhook is configured and processing
4. Check browser console for errors
5. Wait 2-3 minutes and refresh (webhook delay)

**Database Check:**
```sql
SELECT moov_account_id, moov_onboarding_status, moov_onboarding_complete
FROM restaurants
WHERE id = 'restaurant_id';
```

---

#### Issue: Onboarding Invite Expired or Revoked

**Symptoms:**
- Status shows "Revoked" or "Failed"
- Cannot access Moov onboarding

**Solutions:**
1. Create new onboarding invite
2. Click "Start Moov Onboarding" again
3. New invite code will be generated
4. Old invite code will be replaced in database

---

#### Issue: Pre-filled Information Incorrect

**Symptoms:**
- Wrong business name or address in Moov form
- Missing information

**Solutions:**
1. Update restaurant information in Merchant Portal
2. Create new onboarding invite (will use updated data)
3. Or manually correct information in Moov form
4. Data is pre-filled but can be edited in Moov

---

#### Issue: Missing Required Documents

**Symptoms:**
- Moov onboarding requires documents not provided
- Stuck at document upload step

**Solutions:**
1. Prepare required documents:
   - Business license
   - Tax ID/EIN document
   - Owner identification
   - Bank account verification
2. Upload documents in Moov form
3. Ensure documents are clear and valid
4. Contact Moov support if documents are rejected

---

### Support Resources

**For Merchants:**
- Merchant Portal Help Center
- Email: merchant-support@cravenusa.com
- Phone: (Available in portal)
- In-app support chat

**For Technical Issues:**
- Check edge function logs in Supabase
- Review Moov API documentation
- Contact Crave'n technical support

**Moov Support:**
- Moov Dashboard: https://dashboard.moov.io
- Moov Documentation: https://docs.moov.io
- Moov Support: support@moov.io

---

## Appendix A: Data Flow Diagrams

### Moov Onboarding Data Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Merchant   │────────>│   Edge Func  │────────>│  Moov API    │
│    Portal    │ Request │ create-moov- │ Request │              │
│              │         │ onboarding-  │         │              │
│              │         │   invite     │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       │                        ▼                         │
       │                 ┌──────────────┐                │
       │                 │  Database    │                │
       │                 │  restaurants │                │
       │                 │    table     │                │
       │                 └──────────────┘                │
       │                        │                         │
       │                        │                         │
       │<───────────────────────┴─────────────────────────┘
       │              Onboarding Link Returned
       │
       ▼
┌──────────────┐
│   Redirect   │
│     to       │
│     Moov     │
│  Onboarding  │
└──────────────┘
       │
       │ Merchant Completes Onboarding
       │
       ▼
┌──────────────┐         ┌──────────────┐
│     Moov     │────────>│   Webhook    │
│   Dashboard  │ Event   │   Handler    │
└──────────────┘         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  Database    │
                         │   Update     │
                         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Merchant   │
                         │    Portal    │
                         │   (Status    │
                         │   Updated)   │
                         └──────────────┘
```

---

## Appendix B: Configuration Reference

### Moov Onboarding Configuration

**Capabilities (Default):**
- `wallet.balance` - Store funds
- `collect-funds.ach` - Collect via ACH
- `collect-funds.card-payments` - Collect via card
- `send-funds.ach` - Send via ACH

**Scopes (Default):**
- `accounts.read` - Read account information

**Fee Plan Codes:**
- Configure per merchant or use default
- Must exist in Moov dashboard
- Set when creating invite

**Environment Variables:**
```bash
MOOV_SECRET_KEY=your_secret_key
MOOV_PUBLIC_KEY=your_public_key
MOOV_API_URL=https://api.moov.io
MOOV_ACCOUNT_ID=your_account_id
```

---

## Appendix C: API Reference

### Edge Functions

**create-moov-onboarding-invite**
- **Method:** POST
- **Auth:** Required
- **Body:** 
  ```json
  {
    "restaurantId": "uuid",
    "returnURL": "string",
    "termsOfServiceURL": "string",
    "scopes": ["accounts.read"],
    "capabilities": ["wallet.balance", ...],
    "feePlanCodes": ["merchant-direct"],
    "accountType": "business"
  }
  ```
- **Response:**
  ```json
  {
    "code": "invite-code",
    "link": "https://onboarding.moov.io/invite/...",
    "status": "pending",
    "restaurantId": "uuid"
  }
  ```

**manage-moov-onboarding-invites**
- **Method:** GET | DELETE
- **Auth:** Required
- **Query:** `?code=invite-code` (for GET/DELETE specific)
- **Response:** List of invites or specific invite details

---

## Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-12-24 | Initial comprehensive documentation | Invero |

---

**End of Document**

