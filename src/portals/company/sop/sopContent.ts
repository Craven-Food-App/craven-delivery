/**
 * Embedded SOP Content
 * This file contains the full markdown content for all SOPs
 */

export const SOP_CONTENT: Record<string, string> = {
  'INVESTOR_COMPLIANCE_SOP.md': `# Investor Compliance & Intake Process

## Overview

The Investor Compliance Stack ensures that all investor interest submissions are properly tracked, reviewed, and compliant with regulatory requirements.

### Key Objectives

- Compliance-tracked with full audit trail including IP address, user agent, and acknowledgment timestamps
- Properly reviewed before granting access to sensitive materials
- Aligned with Reg D 506(b) requirements for early-stage fundraising
- Visible to CFO in the Investor Relations dashboard for relationship management

### System Components

- Public Form at /investors/interest for compliance-tracked intake
- Admin Review Panel in Admin Portal for approve/deny workflow
- Investor Portal at /investors/portal for gated materials access
- CFO Portal for relationship management
- Request Status Page at /investors/status for investor self-service

---

## Process Flow

### Step 1: Investor Submits Interest

The investor visits /investors/interest and completes the intake form with required fields. They must accept the Crave'n-specific acknowledgment before submission. The system automatically captures IP address, user agent, and timestamp for compliance.

### Step 2: Backend Logging

Data is automatically inserted into the investor_intake table with full audit trail. The submission is synced to investor_interests table for CFO Portal visibility. Status is set to pending awaiting admin review.

### Step 3: Admin Review

Admin or Finance team accesses Admin Portal and navigates to Investor Intake tab. They review submission details including compliance data. Admin can add notes, then approve or deny the request.

### Step 4: Access Decision

For approved requests, investor gains portal access and receives email notification. For denied requests, no access is granted and investor is notified. Status page is updated in both cases.

### Step 5: Portal Access

Approved investors can access /investors/portal to view confidential materials including Pitch Deck, Executive Summary, Financial Projections, Use of Funds, and Reg D Disclosure. They complete accreditation self-certification per Reg D 506(b).

---

## Public Investor Interest Form

### Access Information

- URL: /investors/interest
- Public: Yes, no login required
- Entry Point: Request Investor Access button on /investors landing page

### Required Fields

- Full Name (required)
- Email (required)
- Investor Type (required): Individual, Angel Investor, Fund/VC, or Strategic Investor
- Company/Fund (optional)
- Jurisdiction (optional): Country/State
- Capital Range (optional, non-binding)

### Capital Range Options

- Less than $50,000
- $50,000 to $100,000
- $100,000 to $250,000
- $250,000 to $500,000
- $500,000 to $1,000,000
- Greater than $1,000,000
- Prefer not to say

### Compliance Requirements

The acknowledgment checkbox is required. Investor must accept Crave'n-specific risk disclosure. Submit button remains disabled until accepted. Acceptance timestamp is logged for compliance.

### On Submit Actions

- IP Address captured via API call
- User Agent captured from browser
- Data inserted into investor_intake table
- Data synced to investor_interests table
- Confirmation page shown with status check link

---

## Backend Data Storage

### Primary Table: investor_intake

Purpose: Compliance audit trail for all investor submissions.

Key Fields:

- id: UUID primary key
- full_name: Investor's full name
- email: Contact email
- entity_name: Company/Fund if applicable
- investor_type: Individual/Angel/Fund/Strategic
- jurisdiction: Country/State
- capital_range: Non-binding investment range
- acknowledgment_accepted: Boolean, always true
- accepted_at: Timestamp of acknowledgment
- ip_address: IP address for audit trail
- user_agent: Browser user agent for audit trail
- status: pending, approved, or denied
- reviewed_at: When admin reviewed
- reviewed_by: Admin user ID
- admin_notes: Internal notes
- created_at: Submission timestamp

### Secondary Table: investor_interests

Purpose: CFO Portal visibility and relationship management.

Contains all investor contact information linked to investment opportunities. Supports status tracking through new, contacted, in_discussion, committed, invested, declined, and archived states. Includes shortlist functionality and internal notes.

Sync Logic: Automatically created when investor_intake is submitted. Maps investor types appropriately. Status defaults to new. Source marked as investor_intake_form.

---

## Admin Review Process

### Access Requirements

- Location: Admin Portal, Investor Intake tab
- Required Role: Admin or Finance/Executive department employee
- URL: /admin then click Investor Intake in sidebar

### Review Steps

Step 1 - View Pending Requests: Filter by status (All/Pending/Approved/Denied). Sort by date with newest first.

Step 2 - Review Request Details: Click Review button on any request. View all submitted information. Check compliance data including IP address, user agent, and acknowledgment timestamp.

Step 3 - Add Admin Notes: Internal notes for team reference. Not visible to investor. Useful for tracking conversations and concerns.

Step 4 - Make Decision: Approve grants Investor Portal access. Deny prevents access.

### Approval Action

When clicking Approve and Grant Access:

- Updates investor_intake.status to approved
- Sets reviewed_at timestamp
- Records reviewed_by with your user ID
- Updates investor_profiles.access_status to approved
- Triggers approval email notification

### Denial Action

When clicking Deny Access:

- Updates investor_intake.status to denied
- Sets reviewed_at timestamp
- Records reviewed_by
- Updates investor_profiles.access_status to rejected
- Triggers denial email notification

### Best Practices

- Review within 2-3 business days
- Check LinkedIn profiles if provided
- Verify email domains for legitimacy
- Add notes for context such as referral source or follow-up dates
- Approve strategic investors and funds more quickly
- Be cautious with individual investors and verify accreditation later

---

## Investor Portal Access

### What Investors See After Approval

Accreditation Self-Certification: Reg D 506(b) compliant question with Yes/No/Prefer not to say options. No verification required under 506(b). Saved to investor_profiles.accreditation_status.

Investor Materials Available:

- Pitch Deck for download
- Executive Summary for download
- Financial Projections for viewing
- Use of Funds breakdown
- Reg D Disclosure Summary

Contact Information: Investor Relations email at investors@cravenusa.com with next steps guidance.

### Portal Features

- Gated Access: Only approved investors can view
- Accreditation Tracking: Self-certification logged
- Document Downloads: Pitch deck and executive summary
- Reg D Compliance: Disclosure summary included

---

## CFO Portal Management

### Access Information

- Location: CFO Portal, Investor Relations tab
- URL: /cfo then click Investor Relations

### Dashboard Metrics

- Total Investors: Count from investors table
- Total Capital Raised: Sum of investment amounts
- New Interests: Count with status new
- Shortlisted: Count of shortlisted interests

### Available Tabs

Interested Investors Tab: Lists all investor_interests records from both old and new forms. Actions include update status, add to shortlist, add notes, send email, and call.

Investor List Tab: Shows actual investors from investors table. Tracks ownership percentages, investment amounts, and dates.

Monthly Updates Tab: Draft and send monthly investor updates with template provided.

Cap Table Tab: Summary of investor ownership with links to detailed cap table.

Pitch Deck Tab: Manage pitch deck versions with upload and download.

### Status Management Workflow

- New interest appears with status new
- Review in CFO Portal and update to contacted
- After initial conversation update to in_discussion
- Upon term sheet or commitment update to committed
- When investment closes update to invested and add to investors table

---

## Compliance Requirements

### Reg D 506(b) Compliance

Current Status: Using 506(b) recommended for early stage.

Requirements Met:

- No general advertising, relationship-driven approach
- Up to 35 non-accredited investors allowed
- Self-certification with no verification required
- Acknowledgment logged with timestamps
- IP address and user agent captured
- Materials gated behind approval

### Accreditation Question

Asked in Investor Portal post-approval. Options are Yes, No, or Prefer not to say. No verification required under 506(b). Stored in investor_profiles.accreditation_status.

### Audit Trail Requirements

All Submissions Must Have:

- Full name and email
- Investor type
- Acknowledgment acceptance with timestamp
- IP address
- User agent
- Submission timestamp
- Review timestamp when approved or denied
- Reviewer ID

### Data Retention

- All data retained indefinitely for compliance
- No automatic deletion
- Can be archived but not deleted

### Legal Disclaimers

Required Acknowledgment Text: I acknowledge that the information provided by Crave'n Inc. is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. I understand that any investment involves substantial risk including possible loss of all invested capital. I acknowledge that no representations or guarantees have been made regarding future performance, valuation, or returns.

Landing Page Disclaimer: For informational purposes only. Not an offer or solicitation to buy or sell securities.

---

## Troubleshooting

### Submissions Not Appearing in CFO Portal

Check if investor_interests table has the record. Verify investment_opportunities table has an active opportunity. Confirm sync happened by checking source field equals investor_intake_form.

### Investor Cannot Access Portal After Approval

Verify investor_profiles.access_status equals approved. Check if user is logged in with correct email. Verify InvestorAccessGuard is checking correct table.

### IP Address Not Capturing

API call to ipify.org may be blocked. Check browser console for errors. System falls back to unknown if API fails. Still logs user_agent. Compliance requirement still met with attempted capture.

### Duplicate Submissions

Form allows resubmission by design. Check investor_intake table for multiple entries with same email. Review most recent submission. Archive older duplicates in notes.

---

## Key URLs Reference

- Investor Landing: /investors (Public)
- Interest Form: /investors/interest (Public)
- Request Status: /investors/status (Public)
- Investor Portal: /investors/portal (Approved Only)
- Admin Review: /admin, Investor Intake tab (Admin/Finance)
- CFO Portal: /cfo, Investor Relations tab (CFO/Finance)
- Legacy Form: /investors/access (Public, legacy)

---

## Roles and Responsibilities

### CFO and Investor Relations

- Review submissions in Admin Portal
- Approve or deny access requests
- Manage relationships in CFO Portal
- Update investor statuses
- Send monthly updates
- Maintain cap table

### Admin and Finance Team

- Review investor intake submissions
- Verify legitimacy of requests
- Add admin notes for context
- Approve or deny access

### Legal and Compliance

- Review acknowledgment language
- Ensure Reg D compliance
- Audit trail verification
- Document retention policies

---

## Document Information

Version: 1.0
Effective Date: December 18, 2025
Document Owner: CFO
Review Frequency: Quarterly
Next Review: March 2026

For questions contact:
- Technical Issues: CTO Portal
- Process Questions: CFO Portal
- Compliance Questions: Legal/Compliance team
`,
};
