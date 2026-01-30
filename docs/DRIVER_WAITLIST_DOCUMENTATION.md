# 🚗 Crave'N Driver Waitlist System

## Overview

The Driver Waitlist System allows Crave'N to collect verified driver applications **before** launching in a market, while controlling costs by delaying background checks until routes are actually ready. Drivers complete a full, professional onboarding experience thinking they'll start immediately - only after submission do they learn they're on a waitlist.

---

## Key Benefits

### For Crave'N:
- **Cost Savings**: Save $30-40 per driver by deferring background checks until activation
- **Geographic Control**: Launch city-by-city with pre-vetted driver pools
- **Sales Leverage**: "We have 1,200 drivers ready in your area" when pitching restaurants
- **Quality Control**: Full application filters out casual browsers
- **Scalability**: Can handle 10,000+ waitlisted drivers without cost increase

### For Drivers:
- **Professional Experience**: Full onboarding feels legitimate and serious
- **Clear Expectations**: After submission, they understand the wait
- **Sunk Cost Effect**: Completing full application increases commitment
- **Excitement**: Waitlist feels exclusive, not rejected

---

## How It Works

### 1. Driver Applies (Full Experience)

**Landing Page (`/feeder`):**
- Hero copy: "Start Earning Today" (no mention of waitlist)
- CTA: "Apply to Become a Feeder"
- **No indication** this is a waitlist signup

**Application Wizard (6 Steps):**
1. Account Setup (email, password, name, phone)
2. Address (street, city, state, ZIP)
3. Vehicle & License (type, make, model, license details)
4. Background Check Authorization (last 4 of SSN, banking info)
5. Documents Upload (driver's license, insurance, registration photos)
6. Review & Submit

**Experience:** Feels like immediate onboarding, not a lottery entry

---

### 2. Waitlist Reveal (After Submission)

**What Happens Backend:**
```typescript
// Status set to 'waitlist' instead of 'under_review'
status: 'waitlist'
waitlist_joined_at: NOW()
waitlist_position: auto-calculated (by city/state)
background_check: false
background_check_initiated_at: null  // ← NO COST YET
```

**Full-Screen Success Modal Appears:**
```
You're on the List! 🎉
Thanks for applying, John!

Your application has been received and you've been placed on 
our driver waitlist for Toledo, OH.

What happens next:
✓ We'll review your documents within 48 hours
✓ You'll receive an email confirmation shortly
⏳ When routes open in Toledo, we'll send you an invitation to 
   complete your background check and start delivering

Your Position: #47 in Toledo
Estimated wait time: 2-8 weeks (we're growing fast!)
```

**Confirmation Email Sent Automatically:**
- Subject: "You're on the Crave'N Driver Waitlist! 🚗"
- Body: Same messaging as modal, includes position number and city
- Call-to-action: Download customer app, follow on Instagram

---

### 3. Admin Activation (When Ready to Launch)

**Waitlist Management Dashboard (`/admin`):**
- View all waitlisted drivers by city/state
- Filter by vehicle type, application date, document status
- See waitlist positions and geographic heatmap
- Batch select drivers for activation

**Activation Campaign Flow:**
1. Admin selects city (e.g., "Toledo, OH")
2. System suggests drivers from that area (sorted by `waitlist_position`)
3. Admin filters (e.g., "Only car drivers, top 50 positions")
4. Admin clicks "Send Activation Invites"
5. Confirmation: "You're about to invite 47 drivers. This will cost ~$1,640 in background checks. Continue?"

**Activation Email Sent:**
```
Subject: 🎉 Crave'N is Launching in Toledo! Complete Your Activation

Hi John,

Great news! Crave'N is officially launching delivery routes in 
Toledo, OH and you're invited to be one of our first drivers.

You applied 23 days ago and your spot is ready.

To activate your account:
1. Complete your background check (takes 3-5 business days)
2. Download the Crave'N Driver app
3. Start accepting deliveries immediately after approval

[Button: Complete Background Check] → /driver/activate/:token

This invitation expires in 7 days. Don't miss your spot!
```

---

### 4. Driver Activation Page

**Route:** `/driver/activate/:token`

**What Driver Sees:**
```
Welcome Back, John! 🎉

You're one step away from delivering with Crave'N in Toledo.

We already have your basic info. Just complete these final steps:
```

**3 Final Steps:**
1. **Confirm Password** (if new user, already exists)
2. **Verify Vehicle Details** (pre-filled, editable)
3. **Background Check Authorization** (full SSN, authorize check)

**On Submit:**
- Updates `status` from `'waitlist'` → `'under_review'`
- Stores full SSN (encrypted)
- Sets `background_check_initiated_at: NOW()`
- Triggers actual background check API call ($30-40 charged)
- Creates `driver_profiles` record (status: 'offline')
- Sends "Background Check Initiated" email

---

### 5. Background Check Results

**If Passed:**
- `status` → `'approved'`
- `background_check` → `true`
- `driver_profiles.status` → `'offline'` (ready to go online)
- Email: "🎉 You're Approved! Start Driving with Crave'N"

**If Failed:**
- `status` → `'rejected'`
- Email: "Update on Your Crave'N Driver Application" (with dispute info)

---

## Database Schema

### New Columns Added to `feeder_applications`:

```sql
-- Waitlist tracking
waitlist_joined_at: timestamptz
waitlist_position: integer (auto-calculated)
waitlist_priority_score: integer DEFAULT 0 (for referrals/VIP)
waitlist_notes: text (admin use)

-- Status now includes 'waitlist'
status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'waitlist' | 'invited'
```

### Auto-Calculate Waitlist Position:

```sql
CREATE FUNCTION calculate_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'waitlist' THEN
    NEW.waitlist_position := (
      SELECT COUNT(*) + 1
      FROM feeder_applications
      WHERE status = 'waitlist'
      AND city = NEW.city
      AND state = NEW.state
      AND created_at < NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_waitlist_position
BEFORE INSERT OR UPDATE ON feeder_applications
FOR EACH ROW
WHEN (NEW.status = 'waitlist')
EXECUTE FUNCTION calculate_waitlist_position();
```

---

## Cost Comparison

### Scenario: 1,000 drivers apply in Month 1

**Old System (Immediate Background Checks):**
- 1,000 background checks × $35 = **$35,000**
- But only 100 drivers actually needed → **$31,500 wasted**

**New System (Waitlist):**
- 1,000 applications → **$0 cost** (just database storage)
- Activate 100 drivers when needed → **$3,500**
- **Savings: $31,500** 💰

**Bonus:**
- 900 drivers still on waitlist = future supply ready to activate (no recruitment needed)

---

## Admin Tools

### 1. Waitlist Overview Dashboard

**Location:** Admin panel → "Driver Waitlist"

**Stats Cards:**
- Total Waitlist: 1,247 drivers
- By Status: Waiting (1,100) | Invited (50) | Activated (97)
- Top 3 Cities: Toledo (342), Detroit (189), Cleveland (156)
- Avg Wait Time: 14 days

**Geographic Heatmap:**
- Interactive map showing ZIP codes with driver concentrations
- Color intensity = number of waitlisted drivers
- Click ZIP to see driver list
- Filter by vehicle type

### 2. Waitlist Table

**Columns:**
1. Position # (auto-calculated)
2. Name
3. Location (City, State ZIP)
4. Vehicle Type (icon + label)
5. Status Badge (Waiting/Invited/Activated)
6. Documents Status (✓ Complete or ⚠️ Missing)
7. Applied Date (relative: "3 days ago")
8. Actions (View Details, Invite, Remove)

**Filters:**
- Status dropdown
- City/ZIP search
- Vehicle type multi-select
- Date range picker
- Documents status

**Bulk Actions:**
- Select multiple drivers
- "Invite Selected to Activate"
- "Send Custom Email"
- "Export to CSV"

### 3. Driver Detail Drawer

**Opens when clicking on a driver row:**

**Sections:**
1. **Personal Info**: Name, email, phone, applied date, waitlist position
2. **Location**: City, state, ZIP, map pin
3. **Vehicle**: Type, make/model/year (if applicable)
4. **Documents**: View/download license, insurance photos
5. **Status Management**: Change status, view history
6. **Admin Notes**: Internal notes (auto-saves)

**Actions:**
- "Send Activation Invite"
- "Mark as Priority" (move up list)
- "Refer to Zone" (assign to launch zone)
- "Delete from Waitlist"

### 4. Activation Campaigns

**Purpose:** Batch-invite drivers when launching a new city

**Workflow:**

**Step 1: Define Campaign**
- Campaign name: "Downtown Toledo Lunch Launch"
- Target zone: Select from activation zones
- Target driver count: 50 drivers
- Expiration: 7 days to respond

**Step 2: Select Recipients**
- Auto-suggests drivers from selected zone
- Shows prioritized list (by `created_at` + `priority_score`)
- Filter by vehicle type
- Preview: "You will invite 47 drivers from Toledo, OH"

**Step 3: Customize Email**
- Pre-filled template (editable)
- Subject line: "🎉 Crave'N is Launching in [City]!"
- Body includes activation link
- Preview mode

**Step 4: Review & Send**
- Final confirmation: 47 emails, estimated cost $1,640
- "Send Now" or "Schedule for Later"

**Step 5: Track Campaign**
- Emails sent: 47
- Emails opened: 32 (68%)
- Background checks started: 18 (38%)
- Drivers activated: 12 (26%)
- Real-time updates

---

## Success Metrics (After 90 Days)

### Acquisition:
- **500+ drivers on waitlist**
- **60%+ form completion rate** (start → submit)
- **80%+ email open rate** (waitlist confirmation)

### Activation:
- **40%+ invitation → background check conversion**
- **75%+ background check pass rate**
- **80%+ activated drivers go online within 7 days**

### Engagement:
- **25%+ referral participation** (future feature)
- **<5% waitlist removal requests**
- **4+ driver app logins per week** (once activated)

### Business Impact:
- **Launch new city with 15+ drivers in 2 weeks**
- **30% lower CAC** vs traditional driver recruitment
- **Restaurant pitch success rate +50%** ("we have drivers ready")

---

## Referral System (Future Feature)

### How It Works:
1. After joining waitlist, driver gets unique referral link:
   - Format: `craven.com/drive?ref=TORR123ABC`
2. When someone signs up using referral link:
   - Referee saves `referred_by` in database
   - Referrer gets +10 `priority_score` (moves up waitlist)
   - Referrer gets email: "Thanks for referring John! You moved up 5 spots."
3. Admin sees referral leaderboard
4. Top referrers get priority invitations
5. Bonus: "Refer 5 drivers, skip the line entirely"

### Database Table:
```sql
CREATE TABLE driver_referrals (
  id uuid PRIMARY KEY,
  referrer_id uuid REFERENCES feeder_applications,
  referee_id uuid REFERENCES feeder_applications,
  referral_code text INDEXED,
  status 'pending' | 'completed' | 'activated',
  created_at timestamptz,
  activated_at timestamptz
);
```

**Referral Bonuses:**
- Referrer gets $25 bonus after referee completes 10 deliveries

---

## Security & Compliance

### Data Storage:
- **Waitlist drivers**: Only last 4 of SSN stored (encrypted)
- **Activated drivers**: Full SSN stored (Supabase Vault encryption)
- **Documents**: Private Supabase bucket (`feeder-documents`), not publicly accessible
- **Banking info**: Encrypted at rest

### RLS Policies:
```sql
-- Only admins can view waitlist
CREATE POLICY "Admins view waitlist"
ON feeder_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Drivers can view their own waitlist status
CREATE POLICY "Drivers view own status"
ON feeder_applications FOR SELECT
USING (auth.uid() = user_id);
```

### Email Verification:
- All waitlist emails sent via Resend API
- Rate limiting on signup form (prevent spam)
- Email verification before activation

### Legal Compliance:
- **FCRA Compliance**: Background check authorization collected
- **GDPR**: Right to be forgotten ("Remove me from waitlist" link)
- **CCPA**: Data access requests supported
- **Transparent**: Waitlist revealed immediately after application

---

## Edge Cases & Handling

1. **Duplicate Signups**: Check email uniqueness, show "You're already on the waitlist"
2. **Invalid Documents**: Admin can request resubmit, driver gets email to re-upload
3. **Driver Moves Cities**: Allow drivers to update ZIP code in status page
4. **Expired Invitations**: Auto-revert from `'invited'` → `'waiting'` after 14 days
5. **Driver Loses Interest**: "Remove me from waitlist" link in all emails
6. **Background Check Fails**: Clear communication + dispute option
7. **Driver Never Goes Online**: Track "activated but inactive", send reminder emails

---

## Technical Implementation

### Components Created:
1. **`WaitlistSuccessModal.tsx`**: Full-screen modal shown after application submission
2. **Updated `DriverApplicationWizard.tsx`**: Modified to show modal instead of toast
3. **Updated `ApplicationService.ts`**: Changed `submitApplication()` to set `status: 'waitlist'`
4. **Edge Function**: `send-driver-waitlist-email` (Resend API integration)

### Database Migration:
```sql
-- Add waitlist columns
ALTER TABLE feeder_applications 
ADD COLUMN waitlist_joined_at timestamptz,
ADD COLUMN waitlist_position integer,
ADD COLUMN waitlist_priority_score integer DEFAULT 0,
ADD COLUMN waitlist_notes text;

-- Create auto-position function
CREATE FUNCTION calculate_waitlist_position() ...
CREATE TRIGGER set_waitlist_position ...
```

### Edge Function Deployment:
- Located: `supabase/functions/send-driver-waitlist-email/index.ts`
- Uses Resend API key (already configured in secrets)
- Auto-deployed on next build

---

## Future Enhancements

### Phase 2:
- **Admin Waitlist Dashboard**: Full UI for managing waitlist
- **Activation Campaigns**: Batch-invite drivers by city
- **Geographic Zones**: Define launch zones with target driver counts
- **Referral System**: Drivers earn priority by referring others

### Phase 3:
- **Driver-Facing Status Page**: `/driver/waitlist-status/:email`
- **Analytics Dashboard**: Conversion funnels, time metrics
- **SMS Notifications**: Supplement email with text alerts
- **Automated Scheduling**: Auto-send activations based on restaurant signups

---

## Testing Checklist

### Manual Testing:
- [ ] Complete full driver application (6 steps)
- [ ] Verify waitlist modal appears after submission
- [ ] Check email arrives with correct position number
- [ ] Verify database record has `status: 'waitlist'`
- [ ] Confirm NO background check API call made
- [ ] Test admin viewing waitlist in database

### Edge Cases:
- [ ] Apply with same email twice (should show "already applied")
- [ ] Submit without uploading all documents (should be caught)
- [ ] Test with walking/bike vehicle type (no vehicle details needed)
- [ ] Apply from different cities, verify position calculation works

### Integration:
- [ ] End-to-end: Apply → Waitlist → Admin activates → Background check
- [ ] Email deliverability (check spam folder)
- [ ] Modal closes properly and wizard dismisses
- [ ] No console errors during submission

---

## Rollout Plan

### Week 1: Soft Launch
- Enable for new applications only
- Monitor email delivery rates
- Test admin activation flow manually

### Week 2: Full Launch
- Announce to all new driver applicants
- Update marketing materials ("Join 1,200+ drivers on waitlist")
- Train admin team on waitlist management

### Week 3+: Optimization
- Analyze conversion rates (application → activation → online)
- A/B test waitlist messaging
- Iterate on email templates

---

## Support & FAQs

### For Drivers:
**Q: How long will I be on the waitlist?**
A: Typically 2-8 weeks, depending on when we launch in your city. You'll be among the first to know!

**Q: Can I update my information?**
A: Yes! Email drivers@craven.com and we'll update your profile.

**Q: What if I change my mind?**
A: No problem. Click "Remove from waitlist" in any email we send you.

**Q: Will I lose my spot if I don't respond immediately?**
A: Activation invites expire after 7 days, but we'll re-invite you in the next batch if you miss it.

### For Admins:
**Q: How do I activate drivers?**
A: Go to Admin → Driver Waitlist → Select drivers → "Send Activation Invites"

**Q: What happens if a background check fails?**
A: Driver is notified automatically, status changes to 'rejected', and they have option to dispute.

**Q: Can I manually approve a driver?**
A: Yes, use the "Override Background Check" option in the driver detail drawer (use sparingly).

---

## Contact & Support

**Technical Issues:**
- Slack: #driver-waitlist
- Email: tech@craven.com

**Driver Support:**
- Email: drivers@craven.com
- Text: (419) 555-CRAVE

**Admin Training:**
- Video walkthrough: [link]
- Documentation: This file

---

## Changelog

**v1.0 (Current):**
- ✅ Full driver application wizard
- ✅ Waitlist modal after submission
- ✅ Email confirmation system
- ✅ Database schema with auto-position calculation
- ✅ Edge function for email sending

**v1.1 (Planned):**
- 🔄 Admin waitlist dashboard
- 🔄 Activation campaign builder
- 🔄 Geographic zone management
- 🔄 Referral system

---

## Conclusion

The Driver Waitlist System transforms driver acquisition from a reactive process ("hire drivers after restaurants sign up") to a proactive asset ("we already have drivers, let's sign restaurants"). 

The key insight: **Make drivers feel like they're joining something exclusive, not just filling out a form.** The waitlist creates FOMO (fear of missing out) and urgency, which is exactly what Crave'N needs to build momentum before official launch.

The admin controls ensure Crave'N never over-promises to drivers or under-delivers on driver availability to restaurants. It's a controlled, professional rollout system disguised as a standard application.

**Estimated ROI:** Save $20,000-30,000 in unnecessary background checks in first 90 days while building a 1,000+ driver pipeline.

---

**Last Updated:** January 2025  
**Maintained By:** Crave'N Engineering Team  
**Version:** 1.0