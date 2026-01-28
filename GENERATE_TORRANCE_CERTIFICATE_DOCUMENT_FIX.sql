-- GENERATE CERTIFICATE DOCUMENT FOR TORRANCE'S EXISTING CERTIFICATE
-- This will need to be done via the edge function, but this script checks the status

-- Check current certificate status
SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  u.email,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.document_url,
  sc.html_template IS NOT NULL AS has_template
FROM share_certificates sc
LEFT JOIN auth.users u ON sc.recipient_user_id = u.id
WHERE sc.certificate_number = 'CERT-2025-0001';

-- Note: To generate the document, you'll need to:
-- 1. Call the governance-generate-certificate edge function
-- 2. But since the certificate already exists, you may need to:
--    a. Temporarily delete and recreate, OR
--    b. Manually generate the PDF and update document_url, OR  
--    c. Use a modified function that updates existing certificates
--
-- The UI now has a "Generate Document" button that will attempt this,
-- but it may need backend support to handle existing certificates.

