-- REVOKE NATHAN CURRY'S 500,000 SHARES - PERMANENT FIX
-- This will move Nathan's shares from Active to Revoked Grants

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_grant RECORD;
  cancellation_id UUID;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE EXCEPTION 'Nathan Curry user not found';
  END IF;

  RAISE NOTICE 'Found Nathan Curry user_id: %', nathan_user_id;

  -- Find Nathan's 500K grant
  SELECT id, shares_amount, share_class, grant_id, transaction_date
  INTO nathan_grant
  FROM equity_ledger
  WHERE recipient_user_id = nathan_user_id
    AND transaction_type = 'grant'
    AND shares_amount = 500000
  ORDER BY created_at DESC
  LIMIT 1;

  IF nathan_grant IS NULL THEN
    RAISE EXCEPTION 'Nathan Curry 500K grant not found in equity_ledger';
  END IF;

  RAISE NOTICE 'Found Nathan grant: id=%, shares=%, grant_id=%', 
    nathan_grant.id, nathan_grant.shares_amount, nathan_grant.grant_id;

  -- Check if cancellation already exists
  IF EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
      AND (grant_id = nathan_grant.grant_id OR grant_id IS NULL)
  ) THEN
    RAISE NOTICE 'Cancellation already exists for Nathan Curry 500K shares';
  ELSE
    -- Create cancellation entry
    INSERT INTO equity_ledger (
      transaction_type,
      recipient_user_id,
      shares_amount,
      share_class,
      price_per_share,
      transaction_date,
      effective_date,
      grant_id,
      notes
    ) VALUES (
      'cancellation',
      nathan_user_id,
      500000,
      COALESCE(nathan_grant.share_class, 'Common'),
      0.0001,
      CURRENT_DATE,
      CURRENT_DATE,
      nathan_grant.grant_id,
      'Equity revocation: 500,000 shares revoked. Nathan Curry has been exited and terminated. This revocation is permanent and logged in governance_logs.'
    ) RETURNING id INTO cancellation_id;

    RAISE NOTICE 'Created cancellation entry: id=%', cancellation_id;

    -- Log in governance_logs
    INSERT INTO governance_logs (
      action,
      entity_type,
      entity_id,
      description,
      data
    ) VALUES (
      'equity_revoked',
      'executive',
      nathan_user_id::text,
      'Nathan Curry 500,000 shares permanently revoked - executive terminated',
      jsonb_build_object(
        'recipient_user_id', nathan_user_id,
        'shares_revoked', 500000,
        'grant_id', nathan_grant.grant_id,
        'revocation_date', CURRENT_DATE,
        'reason', 'Executive termination - Nathan Curry exited and fired',
        'permanent', true
      )
    );

    RAISE NOTICE 'Logged revocation in governance_logs';
  END IF;

  -- Verify the revocation
  SELECT COUNT(*) INTO cancellation_id
  FROM equity_ledger
  WHERE recipient_user_id = nathan_user_id
    AND transaction_type = 'cancellation'
    AND shares_amount = 500000;

  RAISE NOTICE '✅ Nathan Curry 500K shares revocation complete. Cancellation entries: %', cancellation_id;
END $$;

-- Verify the result
SELECT 
  'Nathan Curry Grants' as type,
  transaction_type,
  shares_amount,
  transaction_date,
  notes
FROM equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com')
ORDER BY created_at DESC;

