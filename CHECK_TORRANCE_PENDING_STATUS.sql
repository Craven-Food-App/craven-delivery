-- CHECK WHY TORRANCE'S CERTIFICATE ISN'T IN PENDING
-- Verify the equity grant and certificate status

-- Check Torrance's equity grants
SELECT 
  el.id AS equity_ledger_id,
  el.recipient_user_id,
  el.shares_amount,
  el.share_class,
  el.transaction_type,
  el.transaction_date,
  el.certificate_id,
  u.email,
  'EQUITY GRANT' AS record_type
FROM equity_ledger el
LEFT JOIN auth.users u ON el.recipient_user_id = u.id
WHERE el.recipient_user_id IN (
  SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
)
AND el.transaction_type = 'grant'
ORDER BY el.transaction_date DESC;

-- Check if any certificates exist for Torrance
SELECT 
  sc.id,
  sc.certificate_number,
  sc.recipient_user_id,
  sc.shares_amount,
  sc.share_class,
  sc.document_url,
  sc.status,
  CASE 
    WHEN sc.document_url IS NULL OR sc.document_url = '' THEN 'NO DOCUMENT - Should be in Pending'
    ELSE 'HAS DOCUMENT - Should be in Issued'
  END AS should_be_in
FROM share_certificates sc
WHERE sc.recipient_user_id IN (
  SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
)
ORDER BY sc.issue_date DESC;

-- Check what the pending logic should find
SELECT 
  el.id AS equity_ledger_id,
  el.recipient_user_id,
  el.shares_amount,
  el.share_class,
  el.transaction_date,
  CASE 
    WHEN sc.id IS NULL THEN 'NO CERTIFICATE - Should be in Pending'
    WHEN sc.document_url IS NULL OR sc.document_url = '' THEN 'CERTIFICATE WITHOUT DOCUMENT - Should be in Pending'
    ELSE 'HAS CERTIFICATE AND DOCUMENT - Should be in Issued'
  END AS pending_status,
  sc.id AS certificate_id,
  sc.certificate_number,
  sc.document_url
FROM equity_ledger el
LEFT JOIN share_certificates sc ON sc.recipient_user_id = el.recipient_user_id 
  AND sc.shares_amount = el.shares_amount
WHERE el.transaction_type = 'grant'
  AND el.recipient_user_id IN (
    SELECT id FROM auth.users WHERE email = 'tstroman.ceo@cravenusa.com'
  )
ORDER BY el.transaction_date DESC;

