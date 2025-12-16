# Investor Experience Layer - Standard Operating Procedure (SOP)

## Overview

The Investor Experience Layer is a compliance-safe system for managing investor interest and access to Crave'n investment materials. It consists of three main components:

1. **Public Investor Landing Page** (`/investors`) - Marketing page with no sensitive information
2. **Investor Access Request** (`/investors/access`) - Form for investors to request access
3. **Private Investor Overview** (`/investors/overview`) - Gated materials for approved investors

---

## Compliance Requirements

### ⚠️ CRITICAL: Legal Compliance Rules

**PUBLIC PAGES MUST NEVER CONTAIN:**
- Financial projections
- Valuation information
- Equity language
- Share price
- ROI claims
- "Invest Now" buttons
- "Buy shares" language
- "Offering" language

**PUBLIC PAGES MUST ALWAYS INCLUDE:**
- Disclaimer: "This page is for informational purposes only and does not constitute an offer to sell, or a solicitation of an offer to buy, any securities."
- CTA must say "Request Investor Access" (NOT "I'm interested" or "Invest Now")

**PRIVATE PAGES REQUIRE:**
- User authentication
- Approved access status in database
- Confidentiality banner

---

## System Architecture

### Database Tables

#### `investor_access_requests`
Stores individual access requests from investors.

**Key Fields:**
- `id` - UUID primary key
- `user_id` - Links to auth.users (nullable for non-logged-in requests)
- `full_name`, `email` - Contact information
- `investor_type` - Enum: 'angel', 'strategic', 'institutional', 'other'
- `status` - Enum: 'pending', 'approved', 'rejected'
- `admin_notes` - Internal notes from admin review

#### `investor_profiles`
Persistent access status per user.

**Key Fields:**
- `user_id` - Primary key, links to auth.users
- `access_status` - Enum: 'none', 'pending', 'approved', 'rejected'

### Access Control Flow

```
1. Investor visits /investors (public, no login)
   ↓
2. Clicks "Request Investor Access"
   ↓
3. Redirected to /investors/access
   ↓
4. If not logged in → Shows auth form
   ↓
5. After login → Shows access request form
   ↓
6. Submits form → Creates record in investor_access_requests
   ↓
7. Sets investor_profiles.access_status = 'pending'
   ↓
8. Admin reviews in Admin Portal → Investor Access tab
   ↓
9. Admin approves/rejects → Updates both tables
   ↓
10. Approved users can access /investors/overview
```

---

## Admin Workflow

### Accessing Investor Access Manager

1. Navigate to Admin Portal (`/admin`)
2. Click "Investor Access" in the sidebar
3. View all pending, approved, and rejected requests

### Reviewing a Request

1. **View List**: See all requests in table format
   - Filter by status (All, Pending, Approved, Rejected)
   - View key information: Name, Email, Type, Organization, Status, Date

2. **View Details**: Click "View Details" on any request
   - See full request information
   - Review investor type, organization, location
   - Check LinkedIn profile (if provided)
   - Read investment thesis/notes
   - View request timestamp

3. **Add Admin Notes**: 
   - Use the "Admin Notes" textarea to document your review
   - Notes are saved with the approval/rejection

4. **Approve or Reject**:
   - Click "Approve" button → Sets status to 'approved'
   - Click "Reject" button → Sets status to 'rejected'
   - System automatically:
     - Updates `investor_access_requests.status`
     - Updates `investor_profiles.access_status`
     - Records `reviewed_at` timestamp
     - Records `reviewed_by` (your user ID)

### Approval Criteria (Recommended)

**Approve if:**
- Legitimate investor (verified email, LinkedIn, organization)
- Appropriate investor type for Crave'n stage
- Clear investment thesis or strategic interest
- No red flags in notes or background

**Reject if:**
- Spam or invalid request
- Not a qualified investor
- Inappropriate or suspicious activity
- Duplicate request from same user

**Pending/Request More Info if:**
- Missing key information (LinkedIn, organization)
- Unclear investment thesis
- Need to verify credentials

---

## User Experience Flow

### For Investors

#### Step 1: Discover Investment Opportunity
- Visit `cravenusa.com/investors`
- Read public information about Crave'n
- No login required
- No sensitive information displayed

#### Step 2: Request Access
- Click "Request Investor Access" button
- If not logged in:
  - Sign in with existing account OR
  - Create new account (email verification required)
- Fill out access request form:
  - Full Name (required)
  - Email (required, pre-filled if logged in)
  - Investor Type (required): Angel, Strategic, Institutional, Other
  - Organization (optional)
  - Location (optional)
  - LinkedIn URL (optional, recommended)
  - Investment Thesis / Notes (optional)
  - Acknowledge two required disclaimers

#### Step 3: Submit Request
- Click "Submit Request"
- See confirmation: "Request Received"
- Status: Pending approval

#### Step 4: Wait for Approval
- Admin reviews request (typically within 1-3 business days)
- No automatic notifications (manual follow-up if needed)

#### Step 5: Access Materials (If Approved)
- Visit `/investors/overview`
- View:
  - Executive Summary
  - Pitch Deck (PDF)
  - Additional Materials (Governance, Internship, etc.)
- All materials marked "Confidential - Do not distribute"

---

## Content Management

### Public Landing Page Content

**Location**: `src/pages/InvestorsLanding.tsx`

**Sections (in order):**
1. Above the Fold
   - H1: "Investors"
   - Value proposition (exact copy required)
   - CTA: "Request Investor Access"
   - Disclaimer text

2. The Problem
   - Cost inefficiency for restaurants
   - Unsustainable economics for drivers
   - Increasingly expensive outcomes for customers
   - Platforms optimized for extraction

3. Crave'n's Solution
   - Driver-centric economics
   - Merchant-friendly structures
   - Membership-based retention
   - Scalable regional expansion

4. Progress (High-level traction, NO numbers)
   - Platform development substantially complete
   - Multi-portal ecosystem live
   - Active market entry strategy
   - Strategic partnerships in development
   - Leadership team operational

5. Business Model
   - Merchant platform fees
   - Consumer membership programs
   - Local market partnerships
   - Platform services & expansion

6. How Crave'n Differs
   - Local sustainability focus
   - Incentive alignment
   - Governance-first model
   - Capital discipline

7. Leadership Philosophy
   - Operators focused on governance
   - Accountability and scalable infrastructure

8. Footer Disclaimer (MANDATORY)
   - "This page is for informational purposes only and does not constitute an offer to sell, or a solicitation of an offer to buy, any securities."

### Private Overview Page Content

**Location**: `src/pages/InvestorOverview.tsx`

**Current Sections:**
- Executive Summary (placeholder)
- Pitch Deck (PDF placeholder)
- Materials (placeholders for Governance, Internship docs)

**To Add Real Content:**
1. Update Executive Summary text in component
2. Upload PDF to Supabase storage
3. Update PDF viewer URL
4. Add links to actual material documents

---

## Technical Implementation

### Routes

```typescript
/investors              → InvestorsLanding (public)
/investors/access       → InvestorAccess (auth required)
/investors/overview     → InvestorOverview (approved access required)
```

### Components

- `src/components/investor/InvestorAccessGuard.tsx` - Access control wrapper
- `src/components/admin/InvestorAccessManager.tsx` - Admin approval interface
- `src/pages/InvestorsLanding.tsx` - Public landing page
- `src/pages/InvestorAccess.tsx` - Access request form
- `src/pages/InvestorOverview.tsx` - Private materials page

### Database Migration

**File**: `supabase/migrations/20251217000001_create_investor_access.sql`

**To Apply:**
```bash
npx supabase db push
```

Or apply manually in Supabase Dashboard → SQL Editor

---

## Maintenance Tasks

### Daily
- [ ] Check Admin Portal → Investor Access for new pending requests
- [ ] Review and approve/reject requests within 24-48 hours

### Weekly
- [ ] Review approved investor list
- [ ] Check for duplicate requests
- [ ] Verify investor_profiles table is in sync with requests

### Monthly
- [ ] Review public landing page content for accuracy
- [ ] Update private materials (pitch deck, executive summary)
- [ ] Audit access logs (if implemented)

---

## Troubleshooting

### Investor Cannot Access Overview Page

**Check:**
1. Is user logged in? → Redirect to `/investors/access`
2. Is `investor_profiles.access_status = 'approved'`? → If not, approve in Admin Portal
3. Is there a record in `investor_profiles`? → If not, approve the request (creates profile)

### Request Not Showing in Admin Portal

**Check:**
1. Is admin logged in with admin role?
2. Check RLS policies are correct
3. Verify `investor_access_requests` table exists
4. Check browser console for errors

### Access Request Not Submitting

**Check:**
1. All required fields filled?
2. Disclaimers checked?
3. User logged in?
4. Database connection working?
5. Check browser console for errors

---

## Security Considerations

### Row Level Security (RLS)

- Users can only view their own requests
- Admins can view all requests
- Users can only view their own investor profile
- Admins can update all profiles

### Access Control

- Private pages protected by `InvestorAccessGuard`
- Automatic redirect if not approved
- Status checked on every page load

### Data Privacy

- Email addresses stored securely
- LinkedIn URLs optional
- Admin notes are internal only
- No financial information collected in requests

---

## Future Enhancements

### Potential Additions

1. **Email Notifications**
   - Auto-email when request submitted
   - Auto-email when approved/rejected
   - Weekly digest for admins

2. **Analytics**
   - Track page views on `/investors`
   - Track conversion rate (views → requests)
   - Track approval rate

3. **Enhanced Materials**
   - Financial model (PDF)
   - Cap table summary
   - Risk factors document
   - Legal structure overview

4. **Investor Portal Features**
   - Document download tracking
   - Q&A section
   - Meeting scheduler
   - Update notifications

5. **Admin Features**
   - Bulk approval/rejection
   - Export to CSV
   - Email templates
   - Automated follow-ups

---

## Contact & Support

**For Technical Issues:**
- Check database migration applied
- Verify RLS policies active
- Review component code in repository

**For Content Updates:**
- Edit `src/pages/InvestorsLanding.tsx` for public page
- Edit `src/pages/InvestorOverview.tsx` for private page
- Follow compliance rules strictly

**For Access Issues:**
- Use Admin Portal → Investor Access
- Check `investor_profiles` table directly if needed
- Verify user_id matches auth.users

---

## Version History

- **v1.0** (2024-12-17): Initial implementation
  - Public landing page
  - Access request form
  - Private overview page
  - Admin approval interface
  - Database schema and RLS policies

---

**Last Updated**: December 17, 2024
**Maintained By**: Development Team
**Compliance Review**: Required before any content changes

