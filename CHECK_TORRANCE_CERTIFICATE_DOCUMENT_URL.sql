-- CHECK TORRANCE STROMAN CERTIFICATE DOCUMENT_URL
-- Verify if the certificate has a document_url

SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  u.email AS recipient_email,
  up.full_name AS recipient_name,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.status,
  sc.document_url,
  sc.html_template IS NOT NULL AS has_html_template,
  sc.created_at,
  sc.updated_at
FROM share_certificates sc
LEFT JOIN auth.users u ON sc.recipient_user_id = u.id
LEFT JOIN user_profiles up ON sc.recipient_user_id = up.user_id
WHERE sc.certificate_number = 'CERT-2025-0001'
   OR (sc.recipient_user_id IN (
     SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
   ) AND sc.shares_amount = 10500000);

