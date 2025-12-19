---
title: "SOP-ADMIN-001: Investor Intake & Onboarding"
document_id: "SOP-ADMIN-INTAKE-001"
version: "1.0"
effective_date: "2025-12-18"
department: "Finance"
category: "ADMIN"
process_owner: "CFO"
review_frequency: "Quarterly"
---

# SOP-ADMIN-001: Investor Intake & Onboarding

**Document ID:** SOP-ADMIN-INTAKE-001  
**Version:** 1.0  
**Effective Date:** December 18, 2025  
**Department:** Finance / Investor Relations  
**Classification:** Internal - Confidential

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Regulatory Compliance](#3-regulatory-compliance)
4. [System Overview](#4-system-overview)
5. [Public Intake Form](#5-public-intake-form)
6. [Admin Review Interface](#6-admin-review-interface)
7. [Review Process](#7-review-process)
8. [Approval Workflow](#8-approval-workflow)
9. [Denial Workflow](#9-denial-workflow)
10. [Audit Trail](#10-audit-trail)
11. [CFO Portal Integration](#11-cfo-portal-integration)
12. [Best Practices](#12-best-practices)
13. [Troubleshooting](#13-troubleshooting)
14. [Database Reference](#14-database-reference)

---

## 1. Purpose

This Standard Operating Procedure establishes guidelines for managing investor intake requests within the Craven Admin Portal. The Investor Intake system is designed to be **Reg D 506(b) compliant**, capturing full audit trails for securities compliance while managing investor access to confidential materials.

---

## 2. Scope

This SOP applies to:
- Chief Financial Officer (CFO)
- Finance Team Members
- System Administrators
- Compliance Officers

### Systems Covered
- Admin Portal → Investor Intake Tab
- Public Investor Interest Form (`/investors/interest`)
- CFO Portal → Investor Relations
- Supabase `investor_intake` Table
- Supabase `investor_interests` Table (CFO Portal sync)
- Supabase `investor_profiles` Table (access control)

---

## 3. Regulatory Compliance

### 3.1 Reg D 506(b) Requirements

The Investor Intake system is designed to comply with SEC Regulation D 506(b):

| Requirement | Implementation |
|-------------|----------------|
| No general advertising | Materials gated behind approval |
| Up to 35 non-accredited investors | Tracked in admin portal |
| Self-certification allowed | Acknowledgment checkbox |
| Full audit trail | IP, user agent, timestamps logged |
| Risk disclosure | Required acknowledgment text |

### 3.2 Required Acknowledgment

Investors must accept this disclosure before submission:

> *"I acknowledge that the information provided by Crave'n Inc. is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. I understand that any investment involves substantial risk including possible loss of all invested capital. I acknowledge that no representations or guarantees have been made regarding future performance, valuation, or returns."*

### 3.3 Audit Data Captured

| Data Point | Purpose |
|------------|---------|
| IP Address | Geographic verification, fraud detection |
| User Agent | Browser/device identification |
| Accepted At | Timestamp of acknowledgment |
| Submitted At | Form submission timestamp |
| Reviewed At | Admin review timestamp |
| Reviewed By | Admin user ID who made decision |

---

## 4. System Overview

### 4.1 Data Flow

```
Investor visits /investors/interest
          ↓
Completes intake form with required acknowledgment
          ↓
System captures: IP address, user agent, timestamp
          ↓
Data inserted into investor_intake table (status: pending)
          ↓
Data synced to investor_interests table (for CFO Portal)
          ↓
Admin reviews in Admin Portal → Investor Intake tab
          ↓
Admin approves or denies
          ↓
If approved: investor_profiles updated with approved status
          ↓
Investor gains access to /investors/portal (gated materials)
```

### 4.2 Tables Involved

| Table | Purpose |
|-------|---------|
| `investor_intake` | Primary compliance audit trail |
| `investor_interests` | CFO Portal relationship management |
| `investor_profiles` | Access control for gated content |

---

## 5. Public Intake Form

### 5.1 Access Information

- **URL:** `/investors/interest`
- **Public:** Yes, no login required
- **Entry Point:** "Request Investor Access" button on `/investors` landing page

### 5.2 Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Full Name | Text | **Yes** | Investor's legal name |
| Email | Email | **Yes** | Contact email |
| Company / Fund | Text | No | Entity name if applicable |
| Investor Type | Select | **Yes** | Individual, Angel, Fund/VC, Strategic |
| Jurisdiction | Text | No | Country/State |
| Capital Range | Select | No | Non-binding investment range |
| Acknowledgment | Checkbox | **Yes** | Risk disclosure acceptance |

### 5.3 Capital Range Options

- Less than $50,000
- $50,000 - $100,000
- $100,000 - $250,000
- $250,000 - $500,000
- $500,000 - $1,000,000
- Greater than $1,000,000
- Prefer not to say

### 5.4 Investor Types

| Type | Description |
|------|-------------|
| Individual | Personal investor |
| Angel | Angel investor |
| Fund / VC | Venture capital or investment fund |
| Strategic | Corporate/strategic investor |

### 5.5 On Submit Actions

1. IP Address captured via ipify.org API
2. User Agent captured from browser
3. Timestamp recorded for acknowledgment
4. Data inserted into `investor_intake` table
5. Data synced to `investor_interests` table
6. If logged in, `investor_profiles` created/updated with pending status
7. Confirmation screen shown with status check link

---

## 6. Admin Review Interface

### 6.1 Access Path

```
Admin Portal (/admin) → Investor Intake (sidebar)
```

### 6.2 List View

The main interface displays a table with:

| Column | Description |
|--------|-------------|
| Name | Investor's full name |
| Email | Contact email |
| Type | Investor type (Individual, Angel, etc.) |
| Entity | Company/Fund name or "-" |
| Status | Pending (yellow), Approved (green), Denied (red) |
| Submitted | Date of submission |
| Actions | "Review" button |

### 6.3 Filter Options

Filter by status:
- **All Status** - Show all requests
- **Pending** - Awaiting review
- **Approved** - Access granted
- **Denied** - Access denied

### 6.4 Summary Statistics

Displayed at bottom of page:
- Total Requests
- Pending count
- Approved count
- Denied count

---

## 7. Review Process

### 7.1 Accessing a Request

1. Navigate to Admin Portal → Investor Intake
2. Click **"Review"** button on any row
3. Detail view opens with full information

### 7.2 Detail View Information

**Basic Information:**
- Full Name
- Email
- Investor Type
- Current Status

**Optional Information (if provided):**
- Company / Fund name
- Jurisdiction
- Capital Range

**Compliance Information:**
- Acknowledgment Accepted (Yes/No)
- Acknowledgment Accepted At (timestamp)
- Submitted (timestamp)
- Reviewed (timestamp, if already reviewed)
- IP Address
- User Agent (full browser string)

**Previous Admin Notes** (if any)

### 7.3 Adding Admin Notes

1. Enter notes in the "Admin Notes" textarea
2. Notes are saved when approving or denying
3. Notes are internal and not visible to the investor
4. Use for documenting review rationale

---

## 8. Approval Workflow

### 8.1 Approval Criteria

**Approve if:**
- Legitimate investor (valid email, recognizable entity)
- Appropriate investor type for Craven's stage
- Clear interest or investment thesis
- No red flags in submission data
- Acknowledgment was accepted

### 8.2 Approval Process

1. Review all submission details
2. Check compliance data (IP, user agent, acknowledgment)
3. Add admin notes if needed
4. Click **"Approve & Grant Access"** (green button)

### 8.3 What Happens on Approval

1. `investor_intake.status` → `approved`
2. `investor_intake.reviewed_at` → current timestamp
3. `investor_intake.reviewed_by` → your user ID
4. `investor_intake.admin_notes` → saved if entered
5. `investor_profiles.access_status` → `approved` (if user_id exists)
6. Toast notification: "Request approved"

### 8.4 Investor Access After Approval

Approved investors can:
- Access `/investors/portal` (gated materials)
- View Pitch Deck
- View Executive Summary
- View Financial Projections
- View Reg D Disclosure Summary

---

## 9. Denial Workflow

### 9.1 Denial Criteria

**Deny if:**
- Spam or invalid submission
- Suspicious email domain or pattern
- Not a legitimate investor
- Duplicate submission from same person
- Red flags in IP address or user agent
- Acknowledgment not properly accepted

### 9.2 Denial Process

1. Review submission details
2. Document reason in admin notes (recommended)
3. Click **"Deny Access"** (red button)

### 9.3 What Happens on Denial

1. `investor_intake.status` → `denied`
2. `investor_intake.reviewed_at` → current timestamp
3. `investor_intake.reviewed_by` → your user ID
4. `investor_intake.admin_notes` → saved if entered
5. Toast notification: "Request denied"

### 9.4 After Denial

- Investor does NOT gain portal access
- No automatic email notification (manual follow-up if needed)
- Investor can resubmit with different information if desired

---

## 10. Audit Trail

### 10.1 Data Retention

All intake data is retained indefinitely for compliance:
- No automatic deletion
- Can be archived but not deleted
- Required for SEC compliance

### 10.2 Audit Fields

| Field | Description |
|-------|-------------|
| `created_at` | When form was submitted |
| `accepted_at` | When acknowledgment was accepted |
| `ip_address` | Investor's IP at submission |
| `user_agent` | Browser/device information |
| `reviewed_at` | When admin made decision |
| `reviewed_by` | Admin user ID |
| `updated_at` | Last modification timestamp |

### 10.3 Compliance Verification

For any investor, you can verify:
1. They accepted the risk disclosure
2. When they accepted it
3. What device/browser they used
4. Their IP address at the time
5. When their request was reviewed
6. Who reviewed it

---

## 11. CFO Portal Integration

### 11.1 Automatic Sync

When an investor submits the intake form:
1. Record created in `investor_intake` (compliance)
2. Record also created in `investor_interests` (relationship management)

### 11.2 CFO Portal Visibility

The CFO can view all investor interests in:
```
CFO Portal (/cfo) → Investor Relations
```

### 11.3 Status Mapping

| Intake Status | Interests Status |
|---------------|------------------|
| pending | new |
| approved | (managed separately) |
| denied | (managed separately) |

### 11.4 Relationship Management

After approval, the CFO can:
- Update investor status (contacted, in_discussion, committed, invested)
- Add to shortlist
- Add internal notes
- Track relationship progress

---

## 12. Best Practices

### 12.1 Review Timing

| SLA | Description |
|-----|-------------|
| Within 24-48 hours | Review new requests |
| Same day | High-value or recognized investors |
| Weekly | Clean up old pending requests |

### 12.2 Due Diligence

Before approving:
1. Verify email domain is legitimate
2. Check if entity name is recognizable (for funds/strategic)
3. Review IP address for geographic consistency
4. Check for duplicate submissions
5. Look for patterns of suspicious activity

### 12.3 Documentation

Always document in admin notes:
- Reason for approval/denial (especially denials)
- Any follow-up actions needed
- Source if investor was referred
- Any concerns or flags

### 12.4 Privacy

- Never share investor information externally
- Only approved personnel should access the system
- Audit logs are confidential
- IP addresses are compliance data, not for sharing

---

## 13. Troubleshooting

### 13.1 Request Not Appearing

**Symptoms:**
- Investor claims they submitted but not showing

**Solutions:**
1. Check email spelling (search by partial email)
2. Verify form was actually submitted (not abandoned)
3. Check browser console for submission errors
4. Verify `investor_intake` table directly if needed

### 13.2 Approval Not Granting Access

**Symptoms:**
- Status shows approved but investor can't access portal

**Solutions:**
1. Verify `investor_profiles.access_status` = 'approved'
2. Check if investor is logged in with correct email
3. Verify `user_id` was linked (they must be logged in during submission)
4. Manual fix: update `investor_profiles` directly

### 13.3 IP Address Shows "Unknown"

**Symptoms:**
- IP address field shows "unknown"

**Solutions:**
- ipify.org API may have been blocked
- This is not a failure condition
- User agent is still captured
- Compliance requirement still met with attempted capture

### 13.4 Duplicate Submissions

**Symptoms:**
- Same investor appears multiple times

**Solutions:**
1. Review most recent submission
2. Deny older duplicates with note "Duplicate - see newer submission"
3. Approve only the most recent if appropriate

---

## 14. Database Reference

### 14.1 Table: `investor_intake`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `full_name` | TEXT | Investor name |
| `email` | TEXT | Contact email |
| `entity_name` | TEXT | Company/Fund name |
| `investor_type` | TEXT | Individual/Angel/Fund/Strategic |
| `jurisdiction` | TEXT | Country/State |
| `capital_range` | TEXT | Investment range |
| `acknowledgment_accepted` | BOOLEAN | True if accepted |
| `accepted_at` | TIMESTAMPTZ | When acknowledgment accepted |
| `ip_address` | TEXT | IP at submission |
| `user_agent` | TEXT | Browser info |
| `status` | TEXT | pending/approved/denied |
| `reviewed_at` | TIMESTAMPTZ | When reviewed |
| `reviewed_by` | UUID | Admin user ID |
| `admin_notes` | TEXT | Internal notes |
| `user_id` | UUID | Auth user ID (if logged in) |
| `created_at` | TIMESTAMPTZ | Submission time |
| `updated_at` | TIMESTAMPTZ | Last update |

### 14.2 Table: `investor_profiles`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Primary key, links to auth.users |
| `access_status` | TEXT | none/pending/approved/rejected |
| `accreditation_status` | TEXT | Self-certification status |
| `updated_at` | TIMESTAMPTZ | Last update |

### 14.3 Table: `investor_interests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `opportunity_id` | UUID | Investment opportunity |
| `full_name` | TEXT | Investor name |
| `email` | TEXT | Contact email |
| `investor_type` | TEXT | individual/angel/vc/corporate/other |
| `status` | TEXT | new/contacted/in_discussion/committed/invested/declined/archived |
| `source` | TEXT | investor_intake_form |
| `shortlisted` | BOOLEAN | CFO shortlist flag |

---

## Appendix

### A.1 Glossary

| Term | Definition |
|------|------------|
| Reg D 506(b) | SEC exemption for private placements |
| Accreditation | Investor qualification standard |
| Audit Trail | Compliance record of actions |
| Gated Materials | Content requiring approved access |

### A.2 Related Documents

- Investor Compliance SOP (`INVESTOR_COMPLIANCE_SOP.md`)
- Investor Experience SOP (`INVESTOR_EXPERIENCE_SOP.md`)
- CFO Portal Documentation

### A.3 Key URLs

| Page | URL | Access |
|------|-----|--------|
| Investor Landing | /investors | Public |
| Investor Interest Form | /investors/interest | Public |
| Request Status Check | /investors/status | Public |
| Investor Portal | /investors/portal | Approved only |
| Admin Intake Review | /admin → Investor Intake | Admin only |
| CFO Investor Relations | /cfo → Investor Relations | CFO/Finance |

### A.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 18, 2025 | Finance/IT | Initial release |

---

**Document Approval:**

| Role | Name | Date |
|------|------|------|
| CFO | _________________ | __________ |
| Compliance | _________________ | __________ |

---

*This document is confidential and intended for internal use only. Contains information subject to securities regulations.*

