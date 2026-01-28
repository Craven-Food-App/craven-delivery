-- DELETE TORRANCE STROMAN'S CERTIFICATE FROM ISSUED CERTIFICATES
-- This will remove it from the Issued Certificates tab and allow it to be regenerated
-- After deletion, it will appear in the Pending tab where it can be generated properly

DO $$
DECLARE
  torrance_user_id UUID;
  cert_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Find Torrance Stroman's user_id
  SELECT id INTO torrance_user_id
  FROM auth.users
  WHERE email = 'tstroman.ceo@cravenusa.com'
  LIMIT 1;

  IF torrance_user_id IS NULL THEN
    RAISE NOTICE 'Torrance Stroman user not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Torrance Stroman user_id: %', torrance_user_id;

  -- Find the certificate CERT-2025-0001
  SELECT id INTO cert_id
  FROM share_certificates
  WHERE certificate_number = 'CERT-2025-0001'
     OR (recipient_user_id = torrance_user_id AND shares_amount = 10500000)
  LIMIT 1;

  IF cert_id IS NULL THEN
    RAISE NOTICE 'Certificate CERT-2025-0001 not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found certificate CERT-2025-0001 with id: %', cert_id;

  -- Check if there are any equity_ledger entries linked to this certificate
  -- We may need to update them to remove the certificate_id reference
  UPDATE equity_ledger
  SET certificate_id = NULL
  WHERE certificate_id = cert_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Updated % equity_ledger entries to remove certificate reference', deleted_count;
  END IF;

  -- Delete the certificate
  DELETE FROM share_certificates
  WHERE id = cert_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Successfully deleted certificate CERT-2025-0001';
    RAISE NOTICE 'Certificate can now be regenerated through the normal flow';
  ELSE
    RAISE NOTICE 'No certificate was deleted';
  END IF;

END $$;

-- Verify the deletion
SELECT 
  certificate_number,
  recipient_user_id,
  shares_amount,
  status
FROM share_certificates
WHERE certificate_number = 'CERT-2025-0001';

-- Show what will appear in Pending tab (should include Torrance's grant)
SELECT 
  el.id AS equity_ledger_id,
  el.recipient_user_id,
  el.shares_amount,
  el.share_class,
  el.transaction_date,
  u.email,
  CASE 
    WHEN sc.id IS NULL THEN 'NO CERTIFICATE'
    WHEN sc.document_url IS NULL OR sc.document_url = '' THEN 'NO DOCUMENT'
    ELSE 'HAS CERTIFICATE AND DOCUMENT'
  END AS certificate_status
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
LEFT JOIN share_certificates sc ON sc.recipient_user_id = el.recipient_user_id 
  AND sc.shares_amount = el.shares_amount
WHERE el.transaction_type = 'grant'
  AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
  )
ORDER BY el.transaction_date DESC;

