-- CTO_EVALUATION_GATE schema and helpers
-- Non-bypassable, time-boxed evaluation workflow for the CTO

-- ========== ENUMS ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cto_eval_status') THEN
    CREATE TYPE public.cto_eval_status AS ENUM ('active','completed','cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cto_gate_status') THEN
    CREATE TYPE public.cto_gate_status AS ENUM (
      'locked','open','submitted','ceo_review','passed','failed','auto_failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cto_gate_code') THEN
    CREATE TYPE public.cto_gate_code AS ENUM (
      'GATE_1_ARCHITECTURE',
      'GATE_2_SECURITY',
      'GATE_3_EXECUTION',
      'GATE_4_LEADERSHIP',
      'GATE_5_CEO_BRIEFING'
    );
  END IF;
END$$;

-- ========== TABLES ==========
CREATE TABLE IF NOT EXISTS public.cto_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cto_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ceo_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.cto_eval_status NOT NULL DEFAULT 'active',
  evaluation_start_date date NOT NULL,
  evaluation_end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text, -- 'all_pass', 'demotion_recommended', 'termination_recommended'
  fail_count int NOT NULL DEFAULT 0,
  auto_generated_demote boolean NOT NULL DEFAULT false,
  auto_generated_terminate boolean NOT NULL DEFAULT false,
  CONSTRAINT one_active_cto_eval UNIQUE (cto_user_id, status)
);

-- Each gate instance for an evaluation
CREATE TABLE IF NOT EXISTS public.cto_evaluation_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.cto_evaluations(id) ON DELETE CASCADE,
  gate_code public.cto_gate_code NOT NULL,
  gate_order int NOT NULL,
  due_date date NOT NULL,
  status public.cto_gate_status NOT NULL DEFAULT 'locked',
  auto_fail_reason text,
  ceo_decision text, -- 'pass','fail','conditional_pass'
  ceo_decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, gate_code)
);

-- CTO submissions (payload is gate-specific JSON)
CREATE TABLE IF NOT EXISTS public.cto_evaluation_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL REFERENCES public.cto_evaluation_gates(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Audit trail / events
CREATE TABLE IF NOT EXISTS public.cto_evaluation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.cto_evaluations(id) ON DELETE CASCADE,
  gate_id uuid REFERENCES public.cto_evaluation_gates(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL, -- 'INITIATED','GATE_OPENED','SUBMITTED','AUTO_FAILED','CEO_DECISION','COMPLETED'
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== HELPER: START EVALUATION (CEO ONLY) ==========
CREATE OR REPLACE FUNCTION public.start_cto_evaluation(p_cto_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_ceo_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_eval_id uuid;
  v_start date := current_date;
  v_end date := (current_date + interval '14 days')::date;
BEGIN
  -- Only CEO / universal access may start
  IF NOT public.is_ceo(v_ceo_user_id) AND NOT public.has_universal_access() THEN
    RAISE EXCEPTION 'Only CEO may start CTO evaluation';
  END IF;

  -- Ensure no other active evaluation for this CTO
  SELECT id INTO v_existing_id
  FROM public.cto_evaluations
  WHERE cto_user_id = p_cto_user_id
    AND status = 'active';

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Active CTO evaluation already exists';
  END IF;

  INSERT INTO public.cto_evaluations (
    cto_user_id, ceo_user_id, status, evaluation_start_date, evaluation_end_date
  )
  VALUES (
    p_cto_user_id, v_ceo_user_id, 'active', v_start, v_end
  )
  RETURNING id INTO v_eval_id;

  -- Seed 5 gates with due dates: D+4,6,10,12,14
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
    v_eval_id, v_ceo_user_id, 'INITIATED',
    jsonb_build_object(
      'message','CTO Evaluation Gate initiated',
      'evaluation_start_date', v_start,
      'evaluation_end_date', v_end
    )
  );

  RETURN v_eval_id;
END;
$$;

-- ========== HELPER: PROCESS DEADLINES / OUTCOMES ==========
CREATE OR REPLACE FUNCTION public.process_cto_evaluation_timeouts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_eval record;
  v_gate record;
  v_fail_count int;
BEGIN
  FOR v_eval IN
    SELECT * FROM public.cto_evaluations
    WHERE status = 'active'
  LOOP
    -- Auto-fail any non-complete gates past due
    FOR v_gate IN
      SELECT * FROM public.cto_evaluation_gates
      WHERE evaluation_id = v_eval.id
        AND due_date < current_date
        AND status IN ('open','submitted','ceo_review')
    LOOP
      UPDATE public.cto_evaluation_gates
      SET status = 'auto_failed',
          auto_fail_reason = COALESCE(auto_fail_reason, 'Deadline missed without completion')
      WHERE id = v_gate.id;

      INSERT INTO public.cto_evaluation_events (
        evaluation_id, gate_id, actor_user_id, event_type, details
      ) VALUES (
        v_eval.id, v_gate.id, v_eval.ceo_user_id,
        'AUTO_FAILED',
        jsonb_build_object('reason','deadline_missed','gate_code', v_gate.gate_code)
      );
    END LOOP;

    -- Count failures
    SELECT count(*) INTO v_fail_count
    FROM public.cto_evaluation_gates
    WHERE evaluation_id = v_eval.id
      AND status IN ('failed','auto_failed');

    UPDATE public.cto_evaluations
    SET fail_count = v_fail_count
    WHERE id = v_eval.id;

    -- Outcome rules
    IF v_fail_count >= 2 THEN
      UPDATE public.cto_evaluations
      SET status = 'completed',
          outcome = 'termination_recommended',
          auto_generated_terminate = true,
          completed_at = now()
      WHERE id = v_eval.id;

      INSERT INTO public.cto_evaluation_events (
        evaluation_id, actor_user_id, event_type, details
      ) VALUES (
        v_eval.id, v_eval.ceo_user_id, 'COMPLETED',
        jsonb_build_object('outcome','termination_recommended','fail_count', v_fail_count)
      );
    ELSIF v_fail_count = 1 THEN
      UPDATE public.cto_evaluations
      SET outcome = 'demotion_recommended',
          auto_generated_demote = true
      WHERE id = v_eval.id;
    ELSIF v_fail_count = 0
          AND NOT EXISTS (
            SELECT 1 FROM public.cto_evaluation_gates
            WHERE evaluation_id = v_eval.id
              AND status NOT IN ('passed','failed','auto_failed')
          )
    THEN
      UPDATE public.cto_evaluations
      SET status = 'completed',
          outcome = 'all_pass',
          completed_at = now()
      WHERE id = v_eval.id;

      INSERT INTO public.cto_evaluation_events (
        evaluation_id, actor_user_id, event_type, details
      ) VALUES (
        v_eval.id, v_eval.ceo_user_id, 'COMPLETED',
        jsonb_build_object('outcome','all_pass')
      );
    END IF;
  END LOOP;
END;
$$;

-- ========== RLS POLICIES ==========
ALTER TABLE public.cto_evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_evaluation_gates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_evaluation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cto_evaluation_events      ENABLE ROW LEVEL SECURITY;

-- View policies
CREATE POLICY "cto_eval_view"
ON public.cto_evaluations
FOR SELECT
USING (
  -- CEO / universal
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  -- CTO self
  OR cto_user_id = auth.uid()
  -- Board / CXO read-only (via user_roles)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('CRAVEN_BOARD_MEMBER','CRAVEN_CXO')
  )
);

CREATE POLICY "cto_gates_view"
ON public.cto_evaluation_gates
FOR SELECT
USING (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  OR EXISTS (
    SELECT 1 FROM public.cto_evaluations e
    WHERE e.id = evaluation_id
      AND e.cto_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('CRAVEN_BOARD_MEMBER','CRAVEN_CXO')
  )
);

CREATE POLICY "cto_submissions_view"
ON public.cto_evaluation_submissions
FOR SELECT
USING (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  OR submitted_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.cto_evaluation_gates g
    JOIN public.cto_evaluations e ON e.id = g.evaluation_id
    WHERE g.id = gate_id
      AND e.cto_user_id = auth.uid()
  )
);

CREATE POLICY "cto_events_view"
ON public.cto_evaluation_events
FOR SELECT
USING (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  OR actor_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.cto_evaluations e
    WHERE e.id = evaluation_id
      AND e.cto_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('CRAVEN_BOARD_MEMBER','CRAVEN_CXO')
  )
);

-- Write policies
-- CEO manages evaluations and gates
CREATE POLICY "cto_eval_ceo_manage"
ON public.cto_evaluations
FOR ALL
USING (public.is_ceo(auth.uid()) OR public.has_universal_access())
WITH CHECK (public.is_ceo(auth.uid()) OR public.has_universal_access());

CREATE POLICY "cto_gates_ceo_manage"
ON public.cto_evaluation_gates
FOR UPDATE
USING (public.is_ceo(auth.uid()) OR public.has_universal_access())
WITH CHECK (public.is_ceo(auth.uid()) OR public.has_universal_access());

-- CTO may insert submissions for their own open gates
CREATE POLICY "cto_gate_submissions_cto_insert"
ON public.cto_evaluation_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cto_evaluation_gates g
    JOIN public.cto_evaluations e ON e.id = g.evaluation_id
    WHERE g.id = gate_id
      AND e.cto_user_id = auth.uid()
      AND g.status IN ('open','submitted')
  )
);


