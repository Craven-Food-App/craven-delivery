# Investor Compliance & Intake Process — Standard Operating Procedure

**Version:** 1.0  
**Last Updated:** December 18, 2025  
**Owner:** CFO / Investor Relations

---

## Table of Contents

1. [Overview](#overview)
2. [Process Flow](#process-flow)
3. [Public Investor Interest Form](#public-investor-interest-form)
4. [Backend Data Storage](#backend-data-storage)
5. [Admin Review Process](#admin-review-process)
6. [Approval & Access Management](#approval--access-management)
7. [Investor Portal Access](#investor-portal-access)
8. [CFO Portal Management](#cfo-portal-management)
9. [Compliance Requirements](#compliance-requirements)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Investor Compliance Stack ensures that all investor interest submissions are:
- **Compliance-tracked** with full audit trail (IP address, user agent, acknowledgment timestamps)
- **Properly reviewed** before granting access to sensitive materials
- **Aligned with Reg D 506(b)** requirements for early-stage fundraising
- **Visible to CFO** in the Investor Relations dashboard for relationship management

### Key Components

1. **Public Form** (`/investors/interest`) - Compliance-tracked intake
2. **Admin Review Panel** (Admin Portal → Investor Intake) - Review and approve/deny
3. **Investor Portal** (`/investors/portal`) - Gated materials access
4. **CFO Portal** (CFO Portal → Investor Relations) - Relationship management
5. **Request Status Page** (`/investors/status`) - Investor self-service status check

---

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INVESTOR SUBMITS INTEREST                                │
│    URL: /investors/interest                                 │
│    - Fills out form with required fields                    │
│    - Accepts Crave'n-specific acknowledgment               │
│    - Submits request                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND LOGGING (AUTOMATIC)                             │
│    Tables: investor_intake + investor_interests            │
│    - Full audit trail captured (IP, user agent, timestamp) │
│    - Status set to 'pending'                               │
│    - Data synced to investor_interests for CFO visibility  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ADMIN REVIEW (MANUAL)                                    │
│    Location: Admin Portal → Investor Intake                 │
│    - Review submission details                              │
│    - Check IP address, user agent, acknowledgment           │
│    - Add admin notes if needed                              │
│    - Approve or Deny                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ 4a. APPROVED     │        │ 4b. DENIED       │
│ - Portal access  │        │ - No access      │
│ - Email notify   │        │ - Email notify   │
│ - Status updated │        │ - Status updated │
└──────────────────┘        └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. INVESTOR PORTAL ACCESS                                   │
│    URL: /investors/portal                                   │
│    - Pitch Deck                                             │
│    - Executive Summary                                      │
│    - Financial Projections                                  │
│    - Use of Funds                                           │
│    - Reg D Disclosure                                       │
│    - Accreditation self-certification (Reg D 506b)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Public Investor Interest Form

### Access
- **URL:** `/investors/interest`
- **Public:** Yes (no login required)
- **Entry Point:** "Request Investor Access" button on `/investors` landing page

### Required Fields
1. **Full Name** (required)
2. **Email** (required)
3. **Investor Type** (required)
   - Individual
   - Angel Investor
   - Fund / VC
   - Strategic Investor
4. **Company / Fund** (optional)
5. **Jurisdiction** (optional) - Country/State
6. **Capital Range** (optional, non-binding)
   - Less than $50,000
   - $50,000 - $100,000
   - $100,000 - $250,000
   - $250,000 - $500,000
   - $500,000 - $1,000,000
   - Greater than $1,000,000
   - Prefer not to say

### Compliance Requirements
- **Acknowledgment Checkbox** (REQUIRED)
  - Must accept Crave'n-specific risk disclosure
  - Submit button disabled until accepted
  - Acceptance timestamp logged

### What Happens on Submit
1. **IP Address** captured via API call
2. **User Agent** captured from browser
3. **Data inserted** into `investor_intake` table
4. **Data synced** to `investor_interests` table (for CFO Portal)
5. **Confirmation page** shown with status check link

### Success Confirmation
- Shows "Request Received" message
- Provides "Check Request Status" button
- Links to `/investors/status?email={email}`

---

## Backend Data Storage

### Primary Table: `investor_intake`
**Purpose:** Compliance audit trail

**Fields:**
- `id` - UUID primary key
- `full_name` - Investor's full name
- `email` - Contact email
- `entity_name` - Company/Fund (if applicable)
- `investor_type` - Individual/Angel/Fund/Strategic
- `jurisdiction` - Country/State
- `capital_range` - Non-binding investment range
- `acknowledgment_accepted` - Boolean (always true)
- `accepted_at` - Timestamp of acknowledgment
- `ip_address` - IP address for audit trail
- `user_agent` - Browser user agent for audit trail
- `status` - pending | approved | denied
- `reviewed_at` - When admin reviewed
- `reviewed_by` - Admin user ID
- `admin_notes` - Internal notes
- `user_id` - Auth user ID (if logged in)
- `created_at` - Submission timestamp
- `updated_at` - Last update timestamp

### Secondary Table: `investor_interests`
**Purpose:** CFO Portal visibility and relationship management

**Fields:**
- All investor contact information
- Linked to `investment_opportunities`
- Status tracking (new, contacted, in_discussion, committed, invested, declined, archived)
- Shortlist functionality
- Internal notes

**Sync Logic:**
- Automatically created when `investor_intake` is submitted
- Maps investor types: Individual→individual, Angel→angel, Fund→vc, Strategic→corporate
- Status defaults to 'new'
- Source marked as 'investor_intake_form'

---

## Admin Review Process

### Access
- **Location:** Admin Portal → "Investor Intake" tab
- **Required Role:** Admin or Finance/Executive department employee
- **URL:** `/admin` (then click "Investor Intake" in sidebar)

### Review Steps

1. **View Pending Requests**
   - Filter by status: All / Pending / Approved / Denied
   - Sort by date (newest first)

2. **Review Request Details**
   - Click "Review" button on any request
   - View all submitted information
   - Check compliance data:
     - IP address
     - User agent
     - Acknowledgment acceptance timestamp
   - Review admin notes (if any)

3. **Add Admin Notes** (optional)
   - Internal notes for team reference
   - Not visible to investor
   - Useful for tracking conversations, concerns, etc.

4. **Make Decision**
   - **Approve:** Grants Investor Portal access
   - **Deny:** No access granted

### Approval Action
When clicking "Approve & Grant Access":
- Updates `investor_intake.status` to 'approved'
- Sets `reviewed_at` timestamp
- Records `reviewed_by` (your user ID)
- Updates `investor_profiles.access_status` to 'approved' (if user_id exists)
- **TODO:** Sends approval email notification (edge function to be implemented)

### Denial Action
When clicking "Deny Access":
- Updates `investor_intake.status` to 'denied'
- Sets `reviewed_at` timestamp
- Records `reviewed_by`
- Updates `investor_profiles.access_status` to 'rejected' (if user_id exists)
- **TODO:** Sends denial email notification (edge function to be implemented)

### Best Practices
- Review within 2-3 business days
- Check LinkedIn profiles if provided
- Verify email domains for legitimacy
- Add notes for context (e.g., "Referred by [name]", "Follow up on [date]")
- Approve strategic investors and funds more quickly
- Be cautious with individual investors (verify accreditation later)

---

## Approval & Access Management

### Access Control
- **Investor Portal** (`/investors/portal`) is protected by `InvestorAccessGuard`
- Checks `investor_profiles.access_status = 'approved'`
- Redirects to `/investors/access` if not approved

### Status Flow
```
pending → approved → Portal Access Granted
pending → denied → No Access
```

### Manual Access Granting
If you need to grant access manually (e.g., for existing relationships):

1. **Via Admin Portal:**
   - Go to Admin Portal → Investor Intake
   - Find or create the intake record
   - Click "Approve & Grant Access"

2. **Via Database (if needed):**
   ```sql
   -- Update investor_intake
   UPDATE investor_intake 
   SET status = 'approved', 
       reviewed_at = now(), 
       reviewed_by = '<admin_user_id>'
   WHERE email = 'investor@example.com';
   
   -- Update investor_profiles (if user_id exists)
   UPDATE investor_profiles
   SET access_status = 'approved',
       updated_at = now()
   WHERE user_id = '<user_id>';
   ```

---

## Investor Portal Access

### What Investors See (After Approval)

1. **Accreditation Self-Certification**
   - Reg D 506(b) compliant question
   - Options: Yes / No / Prefer not to say
   - No verification required (506b)
   - Saved to `investor_profiles.accreditation_status`

2. **Investor Materials**
   - Pitch Deck (download)
   - Executive Summary (download)
   - Financial Projections (view)
   - Use of Funds (view)
   - Reg D Disclosure Summary (view)

3. **Contact Information**
   - Investor Relations email: investors@cravenusa.com
   - Next steps guidance

### Portal Features
- **Gated Access:** Only approved investors can view
- **Accreditation Tracking:** Self-certification logged
- **Document Downloads:** Pitch deck and executive summary
- **Reg D Compliance:** Disclosure summary included

### Adding Documents
Currently, document links show "Coming Soon" placeholders. To add actual documents:

1. Upload files to Supabase Storage (bucket: `investor-materials`)
2. Update `InvestorPortal.tsx` to link to actual files
3. Ensure RLS policies allow approved investors to access

---

## CFO Portal Management

### Access
- **Location:** CFO Portal → "Investor Relations" tab
- **URL:** `/cfo` (then click "Investor Relations")

### Dashboard Metrics
- **Total Investors:** Count from `investors` table (actual investments)
- **Total Capital Raised:** Sum of investment amounts
- **New Interests:** Count of `investor_interests` with status='new'
- **Shortlisted:** Count of shortlisted interests

### Tabs & Functions

#### 1. Interested Investors Tab
- Lists all `investor_interests` records
- Shows submissions from both:
  - Old form (`investor_access_requests`)
  - New form (`investor_intake` → synced to `investor_interests`)
- **Actions Available:**
  - Update status (new → contacted → in_discussion → committed → invested)
  - Add to shortlist
  - Add internal notes
  - Send email
  - Call (if phone provided)

#### 2. Investor List Tab
- Shows actual investors from `investors` table
- Tracks ownership percentages
- Investment amounts and dates

#### 3. Monthly Updates Tab
- Draft and send monthly investor updates
- Template provided
- Tracks update history

#### 4. Cap Table Tab
- Summary of investor ownership
- Links to detailed cap table

#### 5. Pitch Deck Tab
- Manage pitch deck versions
- Upload/download pitch decks

### Status Management Workflow
1. **New Interest Appears** (status='new')
2. **Review in CFO Portal** → Update status to 'contacted'
3. **Initial Conversation** → Update to 'in_discussion'
4. **Term Sheet/Commitment** → Update to 'committed'
5. **Investment Closed** → Update to 'invested' + add to `investors` table

---

## Compliance Requirements

### Reg D 506(b) Compliance

**Current Status:** Using 506(b) (recommended for early stage)

**Requirements Met:**
- ✅ No general advertising (relationship-driven)
- ✅ Up to 35 non-accredited investors allowed
- ✅ Self-certification (no verification required)
- ✅ Acknowledgment logged with timestamps
- ✅ IP address and user agent captured
- ✅ Materials gated behind approval

**Accreditation Question:**
- Asked in Investor Portal (post-approval)
- Options: Yes / No / Prefer not to say
- No verification required (506b)
- Stored in `investor_profiles.accreditation_status`

### Audit Trail Requirements

**All Submissions Must Have:**
- Full name and email
- Investor type
- Acknowledgment acceptance (boolean + timestamp)
- IP address
- User agent
- Submission timestamp
- Review timestamp (when approved/denied)
- Reviewer ID

**Retention:**
- All data retained indefinitely for compliance
- No automatic deletion
- Can be archived but not deleted

### Legal Disclaimers

**Required Acknowledgment Text:**
> I acknowledge that the information provided by Crave'n Inc. is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities.
>
> I understand that any investment in Crave'n Inc. involves substantial risk, including the possible loss of all invested capital.
>
> I further acknowledge that no representations or guarantees have been made regarding future performance, valuation, or returns, and that any investment decision must be made based on my own independent evaluation and, where appropriate, consultation with my professional advisors.

**Landing Page Disclaimer:**
> For informational purposes only. Not an offer or solicitation to buy or sell securities.

---

## Troubleshooting

### Issue: Submissions Not Appearing in CFO Portal

**Check:**
1. Verify `investor_interests` table has the record
   ```sql
   SELECT * FROM investor_interests 
   WHERE email = 'investor@example.com' 
   ORDER BY created_at DESC;
   ```

2. Check if `investment_opportunities` table has an active opportunity
   ```sql
   SELECT * FROM investment_opportunities 
   WHERE is_active = true;
   ```

3. Verify sync happened (check `source` field = 'investor_intake_form')

**Fix:**
- If missing from `investor_interests`, manually insert:
  ```sql
  INSERT INTO investor_interests (
    opportunity_id, full_name, email, company_name, 
    investor_type, status, source
  ) VALUES (
    '<opportunity_id>', 'Name', 'email@example.com', 
    'Company', 'angel', 'new', 'investor_intake_form'
  );
  ```

### Issue: Investor Can't Access Portal After Approval

**Check:**
1. Verify `investor_profiles.access_status = 'approved'`
   ```sql
   SELECT * FROM investor_profiles 
   WHERE user_id = '<user_id>';
   ```

2. Check if user is logged in with correct email
3. Verify `InvestorAccessGuard` is checking correct table

**Fix:**
- Manually update access status:
  ```sql
  UPDATE investor_profiles
  SET access_status = 'approved',
      updated_at = now()
  WHERE user_id = '<user_id>';
  ```

### Issue: IP Address Not Capturing

**Check:**
- API call to `https://api.ipify.org?format=json` may be blocked
- Check browser console for errors

**Fix:**
- Falls back to 'unknown' if API fails
- Still logs user_agent
- Compliance requirement still met (attempted capture)

### Issue: Duplicate Submissions

**Prevention:**
- Form doesn't prevent duplicates (by design - allows resubmission)
- Check `investor_intake` table for multiple entries with same email

**Management:**
- Review most recent submission
- Archive older duplicates in notes
- Consider adding duplicate prevention if needed

---

## Email Notifications (TODO)

### Current Status
Email notifications are **not yet implemented**. Manual notifications required.

### To Implement
1. Create Supabase Edge Function: `send-investor-notification`
2. Trigger on approval/denial in Admin Portal
3. Send emails for:
   - Approval: Welcome + portal access instructions
   - Denial: Polite rejection with contact info

### Manual Notification Process
When approving/denying:
1. Copy investor email from Admin Portal
2. Send email manually with appropriate template
3. Add note in admin_notes: "Email sent on [date]"

---

## Key URLs Reference

| Page | URL | Access |
|------|-----|--------|
| Investor Landing | `/investors` | Public |
| Interest Form | `/investors/interest` | Public |
| Request Status | `/investors/status?email={email}` | Public |
| Investor Portal | `/investors/portal` | Approved Only |
| Admin Review | `/admin` → Investor Intake | Admin/Finance |
| CFO Portal | `/cfo` → Investor Relations | CFO/Finance |
| Legacy Form | `/investors/access` | Public (legacy) |

---

## Roles & Responsibilities

### CFO / Investor Relations
- Review submissions in Admin Portal
- Approve/deny access requests
- Manage relationships in CFO Portal
- Update investor statuses
- Send monthly updates
- Maintain cap table

### Admin / Finance Team
- Review investor intake submissions
- Verify legitimacy of requests
- Add admin notes for context
- Approve/deny access

### Legal / Compliance
- Review acknowledgment language
- Ensure Reg D compliance
- Audit trail verification
- Document retention policies

---

## Version History

- **v1.0** (December 18, 2025) - Initial SOP for Investor Compliance Stack

---

## Questions or Issues?

Contact:
- **Technical Issues:** CTO Portal
- **Process Questions:** CFO Portal
- **Compliance Questions:** Legal/Compliance team

---

**Document Owner:** CFO  
**Review Frequency:** Quarterly  
**Next Review:** March 2026

