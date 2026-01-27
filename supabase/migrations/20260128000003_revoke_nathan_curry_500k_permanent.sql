-- PERMANENT REVOCATION: Nathan Curry 500,000 shares
-- This migration ensures Nathan's shares are permanently revoked and logged
-- Run this ONCE - it's idempotent (safe to run multiple times)

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_grant RECORD;
  cancellation_exists BOOLEAN;
  log_exists BOOLEAN;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nathan Curry user not found - skipping revocation';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Nathan Curry user_id: %', nathan_user_id;

  -- Find Nathan's 500K grant
  SELECT id, shares_amount, share_class, grant_id, transaction_date, created_at
  INTO nathan_grant
  FROM equity_ledger
  WHERE recipient_user_id = nathan_user_id
    AND transaction_type = 'grant'
    AND shares_amount = 500000
  ORDER BY created_at DESC
  LIMIT 1;

  IF nathan_grant IS NULL THEN
    RAISE NOTICE '⚠️ Nathan Curry 500K grant not found - may already be revoked';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Nathan grant: id=%, shares=%, grant_id=%', 
    nathan_grant.id, nathan_grant.shares_amount, nathan_grant.grant_id;

  -- Check if cancellation already exists
  SELECT EXISTS (
    SELECT 1 FROM equity_ledger
    WHERE recipient_user_id = nathan_user_id
      AND transaction_type = 'cancellation'
      AND shares_amount = 500000
      AND (
        (grant_id IS NOT NULL AND grant_id = nathan_grant.grant_id)
        OR (grant_id IS NULL AND created_at > nathan_grant.created_at)
      )
  ) INTO cancellation_exists;

  IF cancellation_exists THEN
    RAISE NOTICE '✅ Cancellation already exists for Nathan Curry 500K shares';
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
      notes,
      created_at
    ) VALUES (
      'cancellation',
      nathan_user_id,
      500000,
      COALESCE(nathan_grant.share_class, 'Common'),
      0.0001,
      CURRENT_DATE,
      CURRENT_DATE,
      nathan_grant.grant_id,
      'PERMANENT REVOCATION: 500,000 shares revoked. Nathan Curry has been exited and terminated. This revocation is permanent and logged in governance_logs.',
      NOW()
    );

    RAISE NOTICE '✅ Created cancellation entry for Nathan Curry 500K shares';
  END IF;

  -- Check if log already exists
  SELECT EXISTS (
    SELECT 1 FROM governance_logs
    WHERE entity_id = nathan_user_id::text
      AND action = 'equity_revoked'
      AND description LIKE '%Nathan Curry%500,000%'
  ) INTO log_exists;

  IF NOT log_exists THEN
    -- Log in governance_logs
    INSERT INTO governance_logs (
      action,
      entity_type,
      entity_id,
      description,
      data,
      created_at
    ) VALUES (
      'equity_revoked',
      'executive',
      nathan_user_id::text,
      'PERMANENT: Nathan Curry 500,000 shares revoked - executive terminated and exited',
      jsonb_build_object(
        'recipient_user_id', nathan_user_id,
        'shares_revoked', 500000,
        'grant_id', nathan_grant.grant_id,
        'revocation_date', CURRENT_DATE,
        'reason', 'Executive termination - Nathan Curry exited and fired',
        'permanent', true,
        'carved_in_stone', true
      ),
      NOW()
    );

    RAISE NOTICE '✅ Logged revocation in governance_logs';
  ELSE
    RAISE NOTICE '✅ Revocation already logged in governance_logs';
  END IF;

  RAISE NOTICE '🎯 Nathan Curry 500K shares revocation COMPLETE and PERMANENT';
END $$;

-- Verify the result
SELECT 
  'VERIFICATION: Nathan Curry Equity Ledger' as info,
  transaction_type,
  shares_amount,
  transaction_date,
  grant_id,
  notes
FROM equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com' LIMIT 1)
ORDER BY created_at DESC;

