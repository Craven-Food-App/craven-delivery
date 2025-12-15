-- Relax permissions for test CTO evaluations so they can be run safely from the Testing Portal
-- without requiring CEO role and without affecting real evaluations.

CREATE OR REPLACE FUNCTION public.start_cto_test_evaluation(p_cto_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_started_by uuid := auth.uid();
  v_eval_id uuid;
  v_start date := current_date;
  v_end date := (current_date + interval '14 days')::date;
BEGIN
  -- NOTE: Unlike the real evaluation starter, this test helper is intentionally
  --       not restricted to is_ceo() to allow safe testing by admins.
  --       It always creates evaluations with is_test = true.

  INSERT INTO public.cto_evaluations (
    cto_user_id,
    ceo_user_id,
    status,
    evaluation_start_date,
    evaluation_end_date,
    is_test
  )
  VALUES (
    p_cto_user_id,
    v_started_by,
    'active',
    v_start,
    v_end,
    true
  )
  RETURNING id INTO v_eval_id;

  -- Seed 5 gates for the test evaluation
  INSERT INTO public.cto_evaluation_gates (
    evaluation_id, gate_code, gate_order, due_date, status
  )
  VALUES
    (v_eval_id, 'GATE_1_ARCHITECTURE', 1, (v_start + interval '4 days')::date, 'open'),
    (v_eval_id, 'GATE_2_SECURITY',     2, (v_start + interval '6 days')::date, 'locked'),
    (v_eval_id, 'GATE_3_EXECUTION',    3, (v_start + interval '10 days')::date, 'locked'),
    (v_eval_id, 'GATE_4_LEADERSHIP',   4, (v_start + interval '12 days')::date, 'locked'),
    (v_eval_id, 'GATE_5_CEO_BRIEFING', 5, (v_start + interval '14 days')::date, 'locked');

  INSERT INTO public.cto_evaluation_events (
    evaluation_id, actor_user_id, event_type, details
  ) VALUES (
    v_eval_id, v_started_by, 'INITIATED',
    jsonb_build_object(
      'message','CTO Test Evaluation Gate initiated (Testing Portal)',
      'evaluation_start_date', v_start,
      'evaluation_end_date', v_end,
      'is_test', true
    )
  );

  RETURN v_eval_id;
END;
$$;


