# Email-to-Invoice Integration Implementation

## Overview

This document describes the email-to-invoice integration system that allows vendors to send invoices to `invoices@cravenusa.com` and have them automatically processed into the Accounts Payable system.

## Architecture

### Components

1. **Supabase Edge Function**: `process-invoice-email`
   - Receives email webhooks from email service provider
   - Parses invoice data from email subject/body
   - Extracts attachments (PDFs/images)
   - Creates invoice records in database
   - Sends notifications to CFO

2. **Database Migration**: `20250120000000_create_invoice_email_logs.sql`
   - Creates `invoice_email_logs` table to track email processing
   - Stores processing status and extracted data

3. **Frontend Updates**: `CorporateAccountsPayable.tsx`
   - Displays notification badge for email-received invoices
   - Shows visual indicator in vendor column
   - Allows filtering/searching for email invoices

## Email Processing Flow

1. **Email Received**: Vendor sends invoice to `invoices@cravenusa.com`
2. **Webhook Triggered**: Email service (Resend/Microsoft 365/etc.) sends webhook to edge function
3. **Data Extraction**:
   - Vendor name from email sender
   - Invoice number from subject/body (regex patterns)
   - Amount from email text (currency patterns)
   - Dates from email (MM/DD/YYYY or YYYY-MM-DD)
   - PDF/image attachments uploaded to Supabase Storage
4. **Invoice Creation**:
   - Generates invoice number (INV-YYYY-XXXXXX format)
   - Creates invoice record with status "pending"
   - Stores attachment URL in `invoice_file_url`
   - Adds note: "Received via email from [vendor_email]"
5. **Notifications**:
   - CFO receives email notification
   - Vendor receives confirmation email
6. **Logging**: Email processing logged in `invoice_email_logs` table

## Setup Instructions

### 1. Configure Email Service

You need to set up email forwarding/webhooks from your email service provider:

**Option A: Resend**
- Create webhook endpoint pointing to: `https://[your-supabase-url]/functions/v1/process-invoice-email`
- Configure email forwarding for `invoices@cravenusa.com`

**Option B: Microsoft 365 / Google Workspace**
- Set up email forwarding to webhook URL
- Configure webhook authentication

### 2. Deploy Edge Function

```bash
# Deploy the edge function
supabase functions deploy process-invoice-email
```

### 3. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

### 4. Run Database Migration

```bash
# Apply the migration
supabase migration up
```

Or manually run the SQL in Supabase Dashboard → SQL Editor.

### 5. Configure Storage Bucket

Ensure the `documents` storage bucket exists and has proper permissions:

```sql
-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for documents bucket
CREATE POLICY "Finance users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'invoices'
);

CREATE POLICY "Finance users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

## Email Format Support

The system extracts data from emails using regex patterns:

### Invoice Number Patterns
- `INV-123`, `Invoice #123`, `Invoice Number: 123`
- Pattern: `/(?:invoice|inv)[\s#:]*([A-Z0-9-]+)/i`

### Amount Patterns
- `$1,234.56`, `Total: $123.45`, `USD 1234.56`
- Pattern: `/\$[\d,]+\.?\d*/g`

### Date Patterns
- `MM/DD/YYYY`, `YYYY-MM-DD`
- Pattern: `/\d{1,2}\/\d{1,2}\/\d{4}/g`

### Attachment Support
- PDF files (`.pdf`)
- Image files (`.jpg`, `.png`)
- Files uploaded to Supabase Storage in `invoices/` folder

## Frontend Features

### Email Invoice Alert
- Displays count of invoices received via email
- Shows alert banner when new email invoices are detected
- "View Email Invoices" button filters to email-received invoices

### Visual Indicators
- Email tag in vendor column: Blue "Email" badge
- Tooltip shows: "Received via email from invoices@cravenusa.com"

### Filtering
- Search for "Received via email" to find all email invoices
- Filter by status to see pending email invoices

## Testing

### Manual Test

1. Send test email to `invoices@cravenusa.com`:
   ```
   Subject: Invoice #TEST-001
   Body: Invoice for $1,000.00
   Invoice Date: 01/20/2025
   Due Date: 02/20/2025
   ```

2. Check Supabase Dashboard:
   - `invoices` table should have new record
   - `invoice_email_logs` should show processing log
   - Status should be "processed"

3. Check CFO Portal:
   - Alert should appear showing new email invoice
   - Invoice should appear in pending tab
   - Vendor column should show "Email" badge

### Webhook Testing

Use curl to test the edge function:

```bash
curl -X POST https://[your-supabase-url]/functions/v1/process-invoice-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [anon-key]" \
  -d '{
    "from": {"email": "vendor@example.com", "name": "Test Vendor"},
    "to": ["invoices@cravenusa.com"],
    "subject": "Invoice #TEST-001",
    "text": "Invoice for $1,000.00\nInvoice Date: 01/20/2025\nDue Date: 02/20/2025"
  }'
```

## Future Enhancements

1. **OCR Integration**: Extract data from PDF invoices using AWS Textract or Google Vision
2. **Machine Learning**: Improve data extraction accuracy with ML models
3. **Vendor Matching**: Auto-match vendors by email domain
4. **Duplicate Detection**: Prevent duplicate invoices from same vendor
5. **Auto-Approval Rules**: Auto-approve invoices under certain thresholds
6. **Multi-Language Support**: Parse invoices in different languages

## Troubleshooting

### Emails Not Processing

1. Check webhook URL is correct
2. Verify email service is forwarding to webhook
3. Check edge function logs in Supabase Dashboard
4. Verify `invoice_email_logs` table exists

### Data Extraction Issues

1. Check email format matches supported patterns
2. Review `extracted_data` JSON in `invoice_email_logs`
3. Manually edit invoice if extraction fails

### Storage Upload Failures

1. Verify `documents` bucket exists
2. Check RLS policies allow uploads
3. Verify file size limits (default 50MB)

## Security Considerations

1. **Webhook Authentication**: Implement signature verification
2. **Rate Limiting**: Prevent spam/abuse
3. **File Validation**: Validate file types and sizes
4. **RLS Policies**: Ensure proper access control
5. **Email Validation**: Verify sender email domain

## Support

For issues or questions:
- Check edge function logs in Supabase Dashboard
- Review `invoice_email_logs` table for processing errors
- Contact development team for assistance


