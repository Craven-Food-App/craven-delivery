-- ==============================================================================
-- CREATE ATOMIC EQUITY ISSUANCE FUNCTION
-- ==============================================================================
-- Issues equity from micro-equity pool atomically when contribution order is paid
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.issue_micro_equity_from_pool(
  p_contribution_order_id UUID,
  p_contributor_email TEXT,
  p_contributor_name TEXT,
  p_shares_promised BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pool_id UUID;
  v_pool_code TEXT := 'family_micro_equity_pool';
  v_remaining_shares BIGINT;
  v_issuance_id UUID;
  v_holder_id UUID;
  v_existing_holding_id UUID;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF p_shares_promised <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'shares_promised must be greater than 0'
    );
  END IF;

  -- Get pool ID and lock the pool row FOR UPDATE
  SELECT id, remaining_reserved_shares
  INTO v_pool_id, v_remaining_shares
  FROM public.equity_pools
  WHERE pool_code = v_pool_code
  FOR UPDATE; -- Critical: Lock prevents concurrent modifications

  IF v_pool_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Micro-equity pool not found'
    );
  END IF;

  -- Validate pool has enough shares
  IF v_remaining_shares < p_shares_promised THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Micro-equity pool exhausted',
      'available', v_remaining_shares,
      'requested', p_shares_promised
    );
  END IF;

  -- Decrement pool atomically
  UPDATE public.equity_pools
  SET 
    remaining_reserved_shares = remaining_reserved_shares - p_shares_promised,
    updated_at = now()
  WHERE id = v_pool_id
  RETURNING remaining_reserved_shares INTO v_remaining_shares;

  -- Create equity issuance record
  INSERT INTO public.equity_issuances (
    issuance_context,
    equity_source,
    equity_pool_id,
    equity_pool_code,
    contribution_order_id,
    shares_issued,
    strike_price_per_share,
    issuance_status,
    issued_at,
    created_at,
    updated_at
  )
  VALUES (
    'family_micro_equity',
    'family_micro_equity',
    v_pool_id,
    v_pool_code,
    p_contribution_order_id,
    p_shares_promised,
    NULL, -- No strike price for micro-equity
    'issued',
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_issuance_id;

  -- Get or create user ID if contributor has account
  SELECT id INTO v_holder_id
  FROM auth.users
  WHERE email = p_contributor_email
  LIMIT 1;

  -- Update or insert cap table holdings
  -- Check if holding already exists for this email+source
  SELECT id INTO v_existing_holding_id
  FROM public.cap_table_holdings
  WHERE holder_email = p_contributor_email
    AND equity_source = 'family_micro_equity';

  IF v_existing_holding_id IS NOT NULL THEN
    -- Update existing holding
    UPDATE public.cap_table_holdings
    SET 
      shares_total = shares_total + p_shares_promised,
      holder_name = COALESCE(holder_name, p_contributor_name),
      holder_user_id = COALESCE(holder_user_id, v_holder_id),
      updated_at = now()
    WHERE id = v_existing_holding_id;
  ELSE
    -- Create new holding
    INSERT INTO public.cap_table_holdings (
      holder_email,
      holder_name,
      holder_user_id,
      shares_total,
      share_class,
      equity_source,
      issuance_id,
      created_at,
      updated_at
    )
    VALUES (
      p_contributor_email,
      p_contributor_name,
      v_holder_id,
      p_shares_promised,
      'Common',
      'family_micro_equity',
      v_issuance_id,
      now(),
      now()
    );
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'issuance_id', v_issuance_id,
    'pool_id', v_pool_id,
    'shares_issued', p_shares_promised,
    'pool_remaining', v_remaining_shares
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in function
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users (RLS will control access)
GRANT EXECUTE ON FUNCTION public.issue_micro_equity_from_pool(UUID, TEXT, TEXT, BIGINT) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.issue_micro_equity_from_pool IS 
  'Atomically issues equity from family_micro_equity_pool when contribution order is paid. 
   Locks pool row, validates availability, decrements pool, creates issuance record, and updates cap table holdings. 
   Returns JSONB with success status and details.';

