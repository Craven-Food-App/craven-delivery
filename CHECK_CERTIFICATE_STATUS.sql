-- CHECK CERTIFICATE STATUS
-- Verify the current state of certificate CERT-2025-0001

-- Check the certificate
SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.status,
  u.email AS recipient_email,
  up.full_name AS recipient_name_from_profile,
  eu.name AS recipient_name_from_exec_users,
  eu.title AS recipient_title
FROM share_certificates sc
LEFT JOIN auth.users u ON sc.recipient_user_id = u.id
LEFT JOIN user_profiles up ON sc.recipient_user_id = up.user_id
LEFT JOIN exec_users eu ON sc.recipient_user_id = eu.user_id
WHERE sc.certificate_number = 'CERT-2025-0001';

-- Check Torrance's user_id
SELECT 
  u.id AS user_id,
  u.email,
  up.full_name AS profile_name,
  eu.name AS exec_name,
  eu.title AS exec_title
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN exec_users eu ON u.id = eu.user_id
WHERE u.email = 'tstroman.ceo@cravenusa.com';

