-- Atomic claim of pending order_assignments for the current driver.
-- Mobile app uses this when the feeder accepts an offer (or a geo-valid batch).

CREATE OR REPLACE FUNCTION public.claim_order_assignment(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver uuid := auth.uid();
  v_order uuid;
  v_status text;
  v_rowcount int;
BEGIN
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT oa.order_id, oa.status
  INTO v_order, v_status
  FROM public.order_assignments oa
  WHERE oa.id = p_assignment_id
    AND oa.driver_id = v_driver
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assignment_not_found');
  END IF;

  IF v_status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assignment_not_pending', 'status', v_status);
  END IF;

  UPDATE public.order_assignments
  SET
    status = 'accepted',
    updated_at = now()
  WHERE id = p_assignment_id
    AND driver_id = v_driver
    AND status = 'pending';

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_claim');
  END IF;

  UPDATE public.orders
  SET
    driver_id = v_driver,
    accepted_at = coalesce(accepted_at, now()),
    accepted_driver_id = coalesce(accepted_driver_id, v_driver)
  WHERE id = v_order;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order);
END;
$$;

-- Claim several assignments in one transaction (e.g. geo-batched offer). All or nothing.
CREATE OR REPLACE FUNCTION public.claim_order_assignments_batch(p_assignment_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver uuid := auth.uid();
  v_id uuid;
  v_order uuid;
  v_status text;
  v_ids uuid[] := coalesce(p_assignment_ids, array[]::uuid[]);
BEGIN
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF array_length(v_ids, 1) IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_assignment_ids');
  END IF;

  FOREACH v_id IN ARRAY v_ids
  LOOP
    SELECT oa.order_id, oa.status
    INTO v_order, v_status
    FROM public.order_assignments oa
    WHERE oa.id = v_id
      AND oa.driver_id = v_driver
    FOR UPDATE;

    IF v_order IS NULL OR v_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'claim_batch_failed' USING
        errcode = 'P0001',
        message = v_id::text;
    END IF;

    UPDATE public.order_assignments
    SET status = 'accepted', updated_at = now()
    WHERE id = v_id
      AND driver_id = v_driver
      AND status = 'pending';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'claim_batch_concurrent' USING errcode = 'P0001';
    END IF;

    UPDATE public.orders
    SET
      driver_id = v_driver,
      accepted_at = coalesce(accepted_at, now()),
      accepted_driver_id = coalesce(accepted_driver_id, v_driver)
    WHERE id = v_order;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', array_length(v_ids, 1));
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_order_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_assignments_batch(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.claim_order_assignment(uuid) IS
  'Driver accepts one pending order_assignment: marks accepted, assigns orders.driver_id.';
COMMENT ON FUNCTION public.claim_order_assignments_batch(uuid[]) IS
  'Driver accepts a batch: all assignments must be pending and owned by caller.';
