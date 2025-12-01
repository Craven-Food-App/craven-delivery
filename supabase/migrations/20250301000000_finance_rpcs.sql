-- Finance Portal RPCs and Approval Engine Helpers
-- This migration adds helper functions that work with the existing
-- finance schema created in earlier migrations.

-- 1) Permission check wrapper for frontend
CREATE OR REPLACE FUNCTION public.rpc_has_finance_permission(
  p_permission_code TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT has_finance_permission(auth.uid(), p_permission_code, p_entity_id);
$$;


-- 2) Start an approval workflow instance for a transaction
CREATE OR REPLACE FUNCTION public.start_approval(
  p_transaction_id UUID,
  p_transaction_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC,
  p_currency CHAR(3),
  p_requested_by UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_workflow approval_workflow_definitions;
  v_queue_id UUID;
  v_steps JSONB;
  v_step JSONB;
  v_total_levels INT;
BEGIN
  SELECT *
  INTO v_workflow
  FROM approval_workflow_definitions
  WHERE transaction_type = p_transaction_type
    AND (entity_id IS NULL OR entity_id = p_entity_id)
    AND is_active = true
  ORDER BY entity_id NULLS LAST
  LIMIT 1;

  IF v_workflow IS NULL THEN
    RAISE EXCEPTION 'No workflow defined for transaction type %', p_transaction_type;
  END IF;

  v_steps := v_workflow.amount_thresholds;
  v_total_levels := jsonb_array_length(v_steps);

  -- Pick the first threshold row where amount is within [min, max]
  SELECT step
  INTO v_step
  FROM jsonb_array_elements(v_steps) AS step
  WHERE (step->>'min')::numeric <= p_amount
    AND (
      (step->>'max') IS NULL
      OR (step->>'max')::numeric >= p_amount
    )
  ORDER BY (step->>'min')::numeric
  LIMIT 1;

  IF v_step IS NULL THEN
    RAISE EXCEPTION 'No approval tier defined for amount %', p_amount;
  END IF;

  INSERT INTO approval_queue (
    transaction_id,
    transaction_type,
    entity_id,
    amount,
    currency,
    requested_by,
    current_approver_role,
    approval_level,
    total_approval_levels,
    workflow_definition_id,
    status,
    approval_history,
    metadata
  )
  VALUES (
    p_transaction_id,
    p_transaction_type,
    p_entity_id,
    p_amount,
    p_currency,
    p_requested_by,
    v_step->>'approver_role',
    1,
    v_total_levels,
    v_workflow.id,
    'pending',
    '[]'::jsonb,
    jsonb_build_object('requires_dual', COALESCE((v_step->>'requires_dual')::boolean, false))
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3) Approve the current level of an approval_queue item
CREATE OR REPLACE FUNCTION public.approve_approval_item(
  p_queue_id UUID,
  p_actor_id UUID DEFAULT auth.uid(),
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_item approval_queue;
  v_workflow approval_workflow_definitions;
  v_steps JSONB;
  v_next_level INT;
  v_next_step JSONB;
BEGIN
  SELECT *
  INTO v_item
  FROM approval_queue
  WHERE id = p_queue_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Approval item not found';
  END IF;

  IF v_item.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval item is not pending';
  END IF;

  SELECT *
  INTO v_workflow
  FROM approval_workflow_definitions
  WHERE id = v_item.workflow_definition_id;

  v_steps := v_workflow.amount_thresholds;
  v_next_level := v_item.approval_level + 1;

  IF v_next_level > jsonb_array_length(v_steps) THEN
    -- Final approval
    UPDATE approval_queue
    SET
      status = 'approved',
      approval_history = approval_history || jsonb_build_object(
        'actor_id', p_actor_id,
        'action', 'approved',
        'comment', p_comment,
        'timestamp', now()
      ),
      current_approver_role = NULL,
      updated_at = now()
    WHERE id = p_queue_id;
  ELSE
    SELECT v_steps->(v_next_level - 1)
    INTO v_next_step;

    UPDATE approval_queue
    SET
      approval_level = v_next_level,
      current_approver_role = v_next_step->>'approver_role',
      approval_history = approval_history || jsonb_build_object(
        'actor_id', p_actor_id,
        'action', 'approved',
        'comment', p_comment,
        'timestamp', now()
      ),
      updated_at = now()
    WHERE id = p_queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4) Reject an approval_queue item
CREATE OR REPLACE FUNCTION public.reject_approval_item(
  p_queue_id UUID,
  p_actor_id UUID DEFAULT auth.uid(),
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE approval_queue
  SET
    status = 'rejected',
    approval_history = approval_history || jsonb_build_object(
      'actor_id', p_actor_id,
      'action', 'rejected',
      'comment', p_comment,
      'timestamp', now()
    ),
    updated_at = now()
  WHERE id = p_queue_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


