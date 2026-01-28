-- ENSURE TORRANCE STROMAN HAS AN EQUITY GRANT FOR CERTIFICATE GENERATION
-- Verify and create if needed

DO $$
DECLARE
  torrance_user_id UUID;
  existing_grant_id UUID;
  grant_count INTEGER;
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

  -- Check if equity grant exists for 10,500,000 shares
  SELECT id INTO existing_grant_id
  FROM equity_ledger
  WHERE recipient_user_id = torrance_user_id
    AND transaction_type = 'grant'
    AND shares_amount = 10500000
  ORDER BY transaction_date DESC
  LIMIT 1;

  IF existing_grant_id IS NULL THEN
    RAISE NOTICE 'No equity grant found for Torrance (10,500,000 shares). Creating one...';
    
    -- Create the equity grant
    INSERT INTO equity_ledger (
      transaction_type,
      recipient_user_id,
      shares_amount,
      share_class,
      transaction_date,
      effective_date,
      notes
    ) VALUES (
      'grant',
      torrance_user_id,
      10500000,
      'Common',
      '2025-11-19', -- Based on his appointment date
      '2025-11-19',
      'Equity grant for Torrance Stroman as CEO - 10,500,000 shares'
    )
    RETURNING id INTO existing_grant_id;
    
    RAISE NOTICE 'Created equity grant: %', existing_grant_id;
  ELSE
    RAISE NOTICE 'Equity grant already exists: %', existing_grant_id;
  END IF;

  -- Verify no certificate exists (or certificate without document_url)
  SELECT COUNT(*) INTO grant_count
  FROM share_certificates
  WHERE recipient_user_id = torrance_user_id
    AND shares_amount = 10500000
    AND (document_url IS NULL OR document_url = '');

  IF grant_count > 0 THEN
    RAISE NOTICE 'Certificate exists but has no document_url - will appear in Pending tab';
  ELSE
    RAISE NOTICE 'No incomplete certificate found - grant will appear in Pending tab';
  END IF;

END $$;

-- Verify the grant exists and will show in pending
SELECT 
  el.id AS equity_ledger_id,
  el.recipient_user_id,
  el.shares_amount,
  el.share_class,
  el.transaction_date,
  el.transaction_type,
  CASE 
    WHEN sc.id IS NULL THEN 'NO CERTIFICATE - Will show in Pending'
    WHEN sc.document_url IS NULL OR sc.document_url = '' THEN 'CERTIFICATE WITHOUT DOCUMENT - Will show in Pending'
    ELSE 'HAS COMPLETE CERTIFICATE - Will show in Issued'
  END AS status_for_ui
FROM equity_ledger el
LEFT JOIN share_certificates sc ON sc.recipient_user_id = el.recipient_user_id 
  AND sc.shares_amount = el.shares_amount
  AND sc.document_url IS NOT NULL 
  AND sc.document_url != ''
WHERE el.transaction_type = 'grant'
  AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
  )
ORDER BY el.transaction_date DESC;

