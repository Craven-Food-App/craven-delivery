-- UPDATE STOCK CERTIFICATE CERT-2025-0001
-- Update to 10,500,000 shares and assign to Torrance Stroman

DO $$
DECLARE
  torrance_user_id UUID;
  cert_id UUID;
  updated_count INTEGER;
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
  LIMIT 1;

  IF cert_id IS NULL THEN
    RAISE NOTICE 'Certificate CERT-2025-0001 not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found certificate CERT-2025-0001 with id: %', cert_id;

  -- Update the certificate
  UPDATE share_certificates
  SET 
    recipient_user_id = torrance_user_id,
    shares_amount = 10500000,
    updated_at = NOW()
  WHERE id = cert_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE 'Successfully updated certificate CERT-2025-0001';
    RAISE NOTICE '  - Recipient: Torrance Stroman (user_id: %)', torrance_user_id;
    RAISE NOTICE '  - Shares: 10,500,000';
  ELSE
    RAISE NOTICE 'No rows updated';
  END IF;

  -- Also update the equity_ledger entry if it exists and is linked to this certificate
  UPDATE equity_ledger
  SET 
    recipient_user_id = torrance_user_id,
    shares_amount = 10500000,
    updated_at = NOW()
  WHERE certificate_id = cert_id
    AND (shares_amount != 10500000 OR recipient_user_id != torrance_user_id);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % equity_ledger entries linked to this certificate', updated_count;
  END IF;

END $$;

-- Verify the update
SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  u.email AS recipient_email,
  up.full_name AS recipient_name,
  sc.shares_amount,
  sc.share_class,
  sc.issue_date,
  sc.status
FROM share_certificates sc
LEFT JOIN auth.users u ON sc.recipient_user_id = u.id
LEFT JOIN user_profiles up ON sc.recipient_user_id = up.user_id
WHERE sc.certificate_number = 'CERT-2025-0001';

