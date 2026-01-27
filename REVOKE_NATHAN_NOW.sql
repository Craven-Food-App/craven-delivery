-- IMMEDIATE FIX: Revoke Nathan Curry's 500,000 shares
-- Run this in Supabase SQL Editor RIGHT NOW

DO $$
DECLARE
  nathan_user_id UUID;
  nathan_grant RECORD;
  cancellation_exists BOOLEAN;
BEGIN
  -- Find Nathan Curry's user ID
  SELECT id INTO nathan_user_id
  FROM auth.users
  WHERE email = 'natecurry.cto@cravenusa.com'
  LIMIT 1;

  IF nathan_user_id IS NULL THEN
    RAISE EXCEPTION 'Nathan Curry user not found';
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
    RAISE EXCEPTION 'Nathan Curry 500K grant not found';
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
        OR (grant_id IS NULL)
      )
  ) INTO cancellation_exists;

  IF cancellation_exists THEN
    RAISE NOTICE '✅ Cancellation already exists - Nathan shares already revoked';
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

  -- Log in governance_logs (idempotent - won't duplicate)
  INSERT INTO governance_logs (
    action,
    entity_type,
    entity_id,
    description,
    data,
    created_at
  )
  SELECT
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
  WHERE NOT EXISTS (
    SELECT 1 FROM governance_logs
    WHERE entity_id = nathan_user_id::text
      AND action = 'equity_revoked'
      AND description LIKE '%Nathan Curry%500,000%'
  );

  RAISE NOTICE '✅ Logged revocation in governance_logs';
  RAISE NOTICE '🎯 Nathan Curry 500K shares revocation COMPLETE';
END $$;

-- VERIFY: Show Nathan's grants and cancellations
SELECT 
  'VERIFICATION' as info,
  transaction_type,
  shares_amount,
  transaction_date,
  grant_id,
  LEFT(notes, 50) as notes_preview
FROM equity_ledger
WHERE recipient_user_id = (SELECT id FROM auth.users WHERE email = 'natecurry.cto@cravenusa.com' LIMIT 1)
ORDER BY created_at DESC;

