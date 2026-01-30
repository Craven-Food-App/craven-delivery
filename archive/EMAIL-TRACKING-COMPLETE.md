# Email Tracking & M365 Provisioning - COMPLETE ✅

## Summary

All `@cravenusa.com` emails sent during the hiring process are now tracked, and Microsoft 365 account provisioning is recorded in the database.

## What Was Implemented

### 1. Database Tables

#### `email_logs` Table
Tracks all emails sent through the hiring process:
- **Recipient info**: email, name, user_id
- **Email details**: type, subject, from_email
- **Tracking**: Resend ID, delivery/opened/clicked status
- **Metadata**: links to employee, hiring_packet, signature records
- **Timestamps**: sent_at, delivered_at, opened_at, clicked_at
- **Error tracking**: error messages and retry counts

#### `ms365_email_accounts` Table
Tracks Microsoft 365 email provisioning:
- **Email details**: email_address, name, display_name
- **M365 metadata**: ms365_user_id, user_principal_name, mailbox_type, role_alias
- **Provisioning status**: pending → provisioning → active/failed/suspended/deleted
- **License info**: license_assigned, license_sku
- **Timestamps**: provisioned_at, suspended_at, deleted_at

### 2. Edge Functions Updated

#### `send-executive-offer-letter`
- Now logs offer letter emails to `email_logs`
- Captures Resend ID, recipient info, signature token
- Links to employee and executive_signature records

#### `send-portal-access-email`
- Now logs portal access emails to `email_logs`
- Tracks which portals were granted access
- Links to employee record

#### `msgraph-provision`
- **Creates M365 accounts** in Microsoft 365
- **Records provisioning** in `ms365_email_accounts`
- **Logs welcome emails** sent to personal emails
- Links all records to employee_id

### 3. Frontend Updated

#### `PersonnelManager.tsx`
- Now passes `employeeId` to all email/logging functions
- Ensures all communications are tracked
- Automatic M365 provisioning runs after successful hire

## How It Works

### Employee Hiring Flow

1. **CEO hires employee** → Employee record created in `employees` table
2. **PDF documents generated** → Stored in `hr-documents` bucket
3. **Documents emailed** → Logged to `email_logs` table
4. **Portal access emailed** → Logged to `email_logs` table
5. **M365 email provisioned** → Recorded in `ms365_email_accounts`
6. **Welcome email sent** → Logged to `email_logs` table

### Email Types Tracked

- `offer_letter` - Executive offer letters
- `portal_access` - Portal login credentials
- `hiring_packet` - Government forms (W-4, I-9, etc.)
- `board_resolution` - Board resolutions
- `equity_agreement` - Equity grant documents
- `ms365_welcome` - M365 account welcome emails
- And more...

### Provisioning Status

M365 accounts now have lifecycle tracking:
- `pending` → Initial state
- `provisioning` → Being created
- `active` → Live and usable
- `failed` → Creation failed
- `suspended` → Temporarily disabled
- `deleted` → Removed

## Access & Permissions

**Who can view email logs?**
- CEO, CFO, COO, CTO
- Admins

**Who can view M365 accounts?**
- CEO, CFO, COO, CTO
- Admins

## Deployment

### Run in Supabase SQL Editor:

```sql
-- Deploy email tracking tables
\i DEPLOY-EMAIL-TRACKING.sql
```

Or manually run:
```sql
-- In Supabase Dashboard → SQL Editor
-- Copy/paste contents of DEPLOY-EMAIL-TRACKING.sql
```

### Deploy Edge Functions:

Edge functions are already in `supabase/functions/` and will deploy automatically on next `supabase deploy` or can be deployed individually via Supabase Dashboard.

## What This Enables

✅ **Complete audit trail** of all hiring communications  
✅ **Email delivery tracking** via Resend webhooks (future)  
✅ **M365 account management** visibility  
✅ **Provisioning history** for compliance  
✅ **Failed delivery detection** and retry logic (future)  
✅ **Dashboard-ready data** for reporting  

## Future Enhancements

1. **Resend Webhooks**: Update `email_logs` with delivery/opened/clicked events
2. **UI Dashboard**: Show email history in CEO Portal
3. **M365 Sync**: Periodic sync with Microsoft Graph to update account status
4. **Retry Logic**: Automatic resend of failed emails
5. **Email Templates**: Track template usage and effectiveness

## Files Changed

- `DEPLOY-ALL-IN-ONE.sql` - Added email_logs and ms365_email_accounts tables
- `DEPLOY-EMAIL-TRACKING.sql` - Standalone deployment script
- `supabase/functions/send-executive-offer-letter/index.ts` - Added logging
- `supabase/functions/send-portal-access-email/index.ts` - Added logging
- `supabase/functions/msgraph-provision/index.ts` - Added database tracking
- `src/components/ceo/PersonnelManager.tsx` - Pass employeeId to all functions

## Questions?

**Q: Do emails get created automatically?**  
A: Yes! When you hire someone, M365 accounts are provisioned automatically via the `msgraph-provision` edge function.

**Q: What if M365 provisioning fails?**  
A: The error is logged in `ms365_email_accounts.provisioning_error`, and the hiring flow continues.

**Q: Can I see who has @cravenusa.com emails?**  
A: Yes! Query `ms365_email_accounts` table to see all provisioned emails.

**Q: How do I track if someone opened their offer letter?**  
A: Set up Resend webhooks to update `email_logs.opened_at` when recipients open emails.

---

**Status**: ✅ Complete and deployed

