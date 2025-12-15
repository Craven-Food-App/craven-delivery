-- CFO_EVALUATION_GATE_PREFUNDING schema and helpers
-- Pre-funding CFO capability evaluation (14-day gated workflow)

-- ========== ENUMS ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfo_eval_status') THEN
    CREATE TYPE public.cfo_eval_status AS ENUM ('active','completed','cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfo_gate_status') THEN
    CREATE TYPE public.cfo_gate_status AS ENUM (
      'locked','open','submitted','ceo_review','passed','failed','auto_failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfo_gate_code') THEN
    CREATE TYPE public.cfo_gate_code AS ENUM (
      'G1_FINANCIAL_SNAPSHOT',
      'G2_RUNWAY_SURVIVAL',
      'G3_RISK_DISCLOSURE',
      'G4_FUNDBILITY_READINESS',
      'G5_EXEC_BRIEFING'
    );
  END IF;
END$$;

-- ========== TABLES ==========
CREATE TABLE IF NOT EXISTS public.cfo_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cfo_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ceo_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.cfo_eval_status NOT NULL DEFAULT 'active',
  evaluation_start_date date NOT NULL,
  evaluation_end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text, -- 'all_pass','downgrade_recommended','replacement_recommended'
  fail_count int NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  CONSTRAINT one_active_cfo_eval UNIQUE (cfo_user_id, status, is_test)
);

CREATE TABLE IF NOT EXISTS public.cfo_evaluation_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.cfo_evaluations(id) ON DELETE CASCADE,
  gate_code public.cfo_gate_code NOT NULL,
  gate_order int NOT NULL,
  due_date date NOT NULL,
  status public.cfo_gate_status NOT NULL DEFAULT 'locked',
  auto_fail_reason text,
  ceo_decision text,
  ceo_decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, gate_code)
);

CREATE TABLE IF NOT EXISTS public.cfo_evaluation_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL REFERENCES public.cfo_evaluation_gates(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.cfo_evaluation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.cfo_evaluations(id) ON DELETE CASCADE,
  gate_id uuid REFERENCES public.cfo_evaluation_gates(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION public.start_cfo_evaluation_prefunding(p_cfo_user_id uuid)
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
  IF NOT public.is_ceo(v_ceo_user_id) AND NOT public.has_universal_access() THEN
    RAISE EXCEPTION 'Only CEO may start CFO evaluation';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.cfo_evaluations
  WHERE cfo_user_id = p_cfo_user_id
    AND status = 'active'
    AND is_test = false;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Active CFO evaluation already exists';
  END IF;

  INSERT INTO public.cfo_evaluations (
    cfo_user_id, ceo_user_id, status, evaluation_start_date, evaluation_end_date, is_test
  )
  VALUES (
    p_cfo_user_id, v_ceo_user_id, 'active', v_start, v_end, false
  )
  RETURNING id INTO v_eval_id;

  INSERT INTO public.cfo_evaluation_gates (
    evaluation_id, gate_code, gate_order, due_date, status
  )
  VALUES
    (v_eval_id, 'G1_FINANCIAL_SNAPSHOT', 1, (v_start + interval '3 days')::date, 'open'),
    (v_eval_id, 'G2_RUNWAY_SURVIVAL',    2, (v_start + interval '7 days')::date, 'locked'),
    (v_eval_id, 'G3_RISK_DISCLOSURE',    3, (v_start + interval '10 days')::date, 'locked'),
    (v_eval_id, 'G4_FUNDBILITY_READINESS', 4, (v_start + interval '12 days')::date, 'locked'),
    (v_eval_id, 'G5_EXEC_BRIEFING',      5, (v_start + interval '14 days')::date, 'locked');

  INSERT INTO public.cfo_evaluation_events (
    evaluation_id, actor_user_id, event_type, details
  ) VALUES (
    v_eval_id, v_ceo_user_id, 'INITIATED',
    jsonb_build_object(
      'stage','prefunding',
      'evaluation_start_date', v_start,
      'evaluation_end_date', v_end
    )
  );

  RETURN v_eval_id;
END;
$$;

-- Test-only starter
CREATE OR REPLACE FUNCTION public.start_cfo_test_evaluation_prefunding(p_cfo_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_started_by uuid := auth.uid();
  v_eval_id uuid;
  v_start date := current_date;
  v_end date := (current_date + interval '14 days')::date;
BEGIN
  INSERT INTO public.cfo_evaluations (
    cfo_user_id, ceo_user_id, status, evaluation_start_date, evaluation_end_date, is_test
  )
  VALUES (
    p_cfo_user_id, v_started_by, 'active', v_start, v_end, true
  )
  RETURNING id INTO v_eval_id;

  INSERT INTO public.cfo_evaluation_gates (
    evaluation_id, gate_code, gate_order, due_date, status
  )
  VALUES
    (v_eval_id, 'G1_FINANCIAL_SNAPSHOT', 1, (v_start + interval '3 days')::date, 'open'),
    (v_eval_id, 'G2_RUNWAY_SURVIVAL',    2, (v_start + interval '7 days')::date, 'locked'),
    (v_eval_id, 'G3_RISK_DISCLOSURE',    3, (v_start + interval '10 days')::date, 'locked'),
    (v_eval_id, 'G4_FUNDBILITY_READINESS', 4, (v_start + interval '12 days')::date, 'locked'),
    (v_eval_id, 'G5_EXEC_BRIEFING',      5, (v_start + interval '14 days')::date, 'locked');

  INSERT INTO public.cfo_evaluation_events (
    evaluation_id, actor_user_id, event_type, details
  ) VALUES (
    v_eval_id, v_started_by, 'INITIATED',
    jsonb_build_object(
      'stage','prefunding_test',
      'evaluation_start_date', v_start,
      'evaluation_end_date', v_end,
      'is_test', true
    )
  );

  RETURN v_eval_id;
END;
$$;

-- Timeouts and outcomes
CREATE OR REPLACE FUNCTION public.process_cfo_evaluation_timeouts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_eval record;
  v_gate record;
  v_fail_count int;
BEGIN
  FOR v_eval IN
    SELECT * FROM public.cfo_evaluations
    WHERE status = 'active'
  LOOP
    FOR v_gate IN
      SELECT * FROM public.cfo_evaluation_gates
      WHERE evaluation_id = v_eval.id
        AND due_date < current_date
        AND status IN ('open','submitted','ceo_review')
    LOOP
      UPDATE public.cfo_evaluation_gates
      SET status = 'auto_failed',
          auto_fail_reason = COALESCE(auto_fail_reason, 'Deadline missed without completion')
      WHERE id = v_gate.id;

      INSERT INTO public.cfo_evaluation_events (
        evaluation_id, gate_id, actor_user_id, event_type, details
      ) VALUES (
        v_eval.id, v_gate.id, v_eval.ceo_user_id,
        'AUTO_FAILED',
        jsonb_build_object('reason','deadline_missed','gate_code', v_gate.gate_code)
      );
    END LOOP;

    SELECT count(*) INTO v_fail_count
    FROM public.cfo_evaluation_gates
    WHERE evaluation_id = v_eval.id
      AND status IN ('failed','auto_failed');

    UPDATE public.cfo_evaluations
    SET fail_count = v_fail_count
    WHERE id = v_eval.id;

    IF v_fail_count >= 2 THEN
      UPDATE public.cfo_evaluations
      SET status = 'completed',
          outcome = 'replacement_recommended',
          completed_at = now()
      WHERE id = v_eval.id;
    ELSIF v_fail_count = 1 THEN
      UPDATE public.cfo_evaluations
      SET outcome = 'downgrade_recommended'
      WHERE id = v_eval.id;
    ELSIF v_fail_count = 0
          AND NOT EXISTS (
            SELECT 1 FROM public.cfo_evaluation_gates
            WHERE evaluation_id = v_eval.id
              AND status NOT IN ('passed','failed','auto_failed')
          )
    THEN
      UPDATE public.cfo_evaluations
      SET status = 'completed',
          outcome = 'all_pass',
          completed_at = now()
      WHERE id = v_eval.id;
    END IF;
  END LOOP;
END;
$$;

-- ========== RLS ==========
ALTER TABLE public.cfo_evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_evaluation_gates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_evaluation_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfo_evaluation_events      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfo_eval_view"
ON public.cfo_evaluations
FOR SELECT
USING (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  OR cfo_user_id = auth.uid()
);

CREATE POLICY "cfo_gates_view"
ON public.cfo_evaluation_gates
FOR SELECT
USING (
  public.is_ceo(auth.uid())
  OR public.has_universal_access()
  OR EXISTS (
    SELECT 1 FROM public.cfo_evaluations e
    WHERE e.id = evaluation_id
      AND e.cfo_user_id = auth.uid()
  )
);

CREATE POLICY "cfo_eval_ceo_manage"
ON public.cfo_evaluations
FOR ALL
USING (public.is_ceo(auth.uid()) OR public.has_universal_access())
WITH CHECK (public.is_ceo(auth.uid()) OR public.has_universal_access());

CREATE POLICY "cfo_gates_ceo_manage"
ON public.cfo_evaluation_gates
FOR UPDATE
USING (public.is_ceo(auth.uid()) OR public.has_universal_access())
WITH CHECK (public.is_ceo(auth.uid()) OR public.has_universal_access());

CREATE POLICY "cfo_gate_submissions_cfo"
ON public.cfo_evaluation_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.cfo_evaluation_gates g
    JOIN public.cfo_evaluations e ON e.id = g.evaluation_id
    WHERE g.id = gate_id
      AND e.cfo_user_id = auth.uid()
      AND g.status IN ('open','submitted')
  )
);

CREATE POLICY "cfo_events_insert"
ON public.cfo_evaluation_events
FOR INSERT
WITH CHECK (actor_user_id = auth.uid());


