-- GENERATE CERTIFICATE DOCUMENT FOR TORRANCE STROMAN
-- This script checks if Torrance's certificate has a document_url
-- If not, it will need to be generated via the governance-generate-certificate function

-- First, check the current state
SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  u.email AS recipient_email,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.status,
  sc.document_url,
  CASE 
    WHEN sc.document_url IS NULL OR sc.document_url = '' THEN 'MISSING - Needs generation'
    ELSE 'EXISTS'
  END AS document_status,
  sc.html_template IS NOT NULL AS has_html_template
FROM share_certificates sc
LEFT JOIN auth.users u ON sc.recipient_user_id = u.id
WHERE sc.certificate_number = 'CERT-2025-0001'
   OR (sc.recipient_user_id IN (
     SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
   ) AND sc.shares_amount = 10500000);

-- Note: To actually generate the certificate document, you'll need to call the
-- governance-generate-certificate edge function with the certificate details.
-- This SQL script only checks the status - the actual document generation
-- should be done through the UI or by calling the edge function directly.

