# How to View Email History

## Where to Find Email Lists

### 1. **In CEO Command Center → Personnel Tab**

Each employee now has a **"View Emails"** button in their action menu.

**Steps:**
1. Log into CEO Command Center
2. Go to **Personnel Management** tab
3. Find the employee you want to check
4. Click **"View Emails"** button (📧 icon)
5. A modal opens showing all emails sent to that employee

### 2. **Directly in Database (Supabase)**

You can query the `email_logs` table directly:

```sql
-- See all emails
SELECT * FROM email_logs 
ORDER BY sent_at DESC;

-- See emails for specific employee
SELECT * FROM email_logs 
WHERE employee_id = 'YOUR_EMPLOYEE_ID'
ORDER BY sent_at DESC;

-- See emails by type
SELECT email_type, COUNT(*) 
FROM email_logs 
GROUP BY email_type;

-- See failed/bounced emails
SELECT * FROM email_logs 
WHERE status IN ('failed', 'bounced')
ORDER BY sent_at DESC;
```

### 3. **Microsoft 365 Account Tracking**

See all provisioned `@cravenusa.com` emails:

```sql
-- All M365 accounts
SELECT * FROM ms365_email_accounts
ORDER BY provisioned_at DESC;

-- Active accounts only
SELECT * FROM ms365_email_accounts
WHERE provisioning_status = 'active'
ORDER BY provisioned_at DESC;

-- Failed provisioning attempts
SELECT * FROM ms365_email_accounts
WHERE provisioning_status = 'failed'
ORDER BY created_at DESC;
```

## What Information Is Shown

### Email History Modal Displays:

- **Type**: Offer Letter, Portal Access, Hiring Packet, etc.
- **Subject**: Email subject line
- **Recipient**: Email address
- **Status**: Sent, Delivered, Opened, Clicked, Bounced, Failed
- **Sent Date**: When the email was sent
- **Sortable**: Click column headers to sort

### Email Types Tracked:

- ✅ `offer_letter` - Executive offer letters
- ✅ `portal_access` - Portal login credentials
- ✅ `hiring_packet` - Government forms (W-4, I-9, etc.)
- ✅ `board_resolution` - Board resolutions
- ✅ `equity_agreement` - Equity grant documents
- ✅ `ms365_welcome` - M365 account welcome emails
- ✅ `background_check` - Background check notifications
- ✅ `driver_welcome` - Driver onboarding emails
- ✅ `restaurant_welcome` - Restaurant onboarding emails
- ✅ `customer_welcome` - Customer welcome emails
- ✅ `approval` - Approval notifications
- ✅ `rejection` - Rejection notifications
- ✅ `waitlist` - Waitlist notifications
- ✅ `other` - Other emails

## Real-World Example

**Scenario:** You hired John Smith as CFO

**Emails Automatically Tracked:**
1. Offer Letter → Sent to john.smith@example.com
2. Portal Access → Sent with temp password
3. Board Resolution → Sent to board@cravenusa.com
4. Equity Agreement → Sent to john.smith@example.com
5. M365 Welcome → Sent to john.smith@example.com with new email: jsmith.cfo@cravenusa.com

**To View:**
1. Go to Personnel Management
2. Find "John Smith"
3. Click "View Emails"
4. See all 5 emails with their status and dates

## Access & Permissions

**Who Can View Email History?**
- ✅ CEO
- ✅ CFO
- ✅ COO
- ✅ CTO
- ✅ Admins

**Who CANNOT View?**
- ❌ Regular employees
- ❌ Customers
- ❌ Drivers
- ❌ Restaurants

## Future Enhancements (Not Yet Implemented)

Coming soon:
- 🔔 Email delivery/open notifications (Resend webhooks)
- 📊 Email analytics dashboard
- 🔄 Automatic retry for failed emails
- 📁 Export email history to CSV
- 🎯 Email template tracking

---

**Need Help?** Deploy the email tracking tables first by running `DEPLOY-EMAIL-TRACKING.sql` in Supabase SQL Editor.

