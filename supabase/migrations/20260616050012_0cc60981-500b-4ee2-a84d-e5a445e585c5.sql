
-- ============================================================
-- 3-WAY RATING & TRUST REPORT SYSTEM
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.party_type AS ENUM ('customer', 'feeder', 'merchant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trust_report_status AS ENUM ('pending', 'reviewing', 'upheld', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trust_report_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- order_ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL,
  rater_type   public.party_type NOT NULL,
  rater_id     uuid NOT NULL,
  ratee_type   public.party_type NOT NULL,
  ratee_id     uuid NOT NULL,
  stars        smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags         text[] NOT NULL DEFAULT '{}',
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, rater_type, ratee_type)
);

GRANT SELECT, INSERT, UPDATE ON public.order_ratings TO authenticated;
GRANT ALL ON public.order_ratings TO service_role;

ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_ratings_ratee   ON public.order_ratings (ratee_type, ratee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_ratings_rater   ON public.order_ratings (rater_type, rater_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_ratings_order   ON public.order_ratings (order_id);

-- Rater can read only their own submissions.
CREATE POLICY "rater_can_read_own_rating"
  ON public.order_ratings
  FOR SELECT TO authenticated
  USING (rater_id = auth.uid());

-- Execs / admins / support can read all.
CREATE POLICY "trust_admins_can_read_ratings"
  ON public.order_ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users e WHERE e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
               AND r.role::text IN ('admin','support','ceo','coo'))
  );

-- Inserts are routed through submit_order_rating(); raw inserts must be by the rater themselves.
CREATE POLICY "rater_can_insert_own_rating"
  ON public.order_ratings
  FOR INSERT TO authenticated
  WITH CHECK (rater_id = auth.uid());

CREATE POLICY "rater_can_update_own_rating_24h"
  ON public.order_ratings
  FOR UPDATE TO authenticated
  USING (rater_id = auth.uid() AND created_at > now() - interval '24 hours')
  WITH CHECK (rater_id = auth.uid());

-- ============================================================
-- trust_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid,
  reporter_type     public.party_type NOT NULL,
  reporter_id       uuid NOT NULL,
  reported_type     public.party_type NOT NULL,
  reported_id       uuid NOT NULL,
  category          text NOT NULL,
  severity          public.trust_report_severity NOT NULL DEFAULT 'medium',
  description       text NOT NULL,
  status            public.trust_report_status NOT NULL DEFAULT 'pending',
  admin_notes       text,
  resolution_action text,
  resolved_by       uuid,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.trust_reports TO authenticated;
GRANT ALL ON public.trust_reports TO service_role;

ALTER TABLE public.trust_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trust_reports_status    ON public.trust_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_reports_reported  ON public.trust_reports (reported_type, reported_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_reports_reporter  ON public.trust_reports (reporter_type, reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_reports_order     ON public.trust_reports (order_id);

CREATE POLICY "reporter_can_read_own_report"
  ON public.trust_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "trust_admins_can_read_reports"
  ON public.trust_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users e WHERE e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
               AND r.role::text IN ('admin','support','ceo','coo'))
  );

CREATE POLICY "reporter_can_insert_own_report"
  ON public.trust_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "trust_admins_can_update_reports"
  ON public.trust_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exec_users e WHERE e.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
               AND r.role::text IN ('admin','support','ceo','coo'))
  );

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_order_ratings_updated ON public.order_ratings;
CREATE TRIGGER trg_order_ratings_updated BEFORE UPDATE ON public.order_ratings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_trust_reports_updated ON public.trust_reports;
CREATE TRIGGER trg_trust_reports_updated BEFORE UPDATE ON public.trust_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- rating_aggregates view (rolling last 100 per entity)
-- ============================================================
CREATE OR REPLACE VIEW public.rating_aggregates AS
WITH ranked AS (
  SELECT
    ratee_type,
    ratee_id,
    stars,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY ratee_type, ratee_id ORDER BY created_at DESC) AS rn
  FROM public.order_ratings
)
SELECT
  ratee_type,
  ratee_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int                  AS rating_count,
  MAX(created_at)                AS last_rated_at
FROM ranked
WHERE rn <= 100
GROUP BY ratee_type, ratee_id;

GRANT SELECT ON public.rating_aggregates TO authenticated, service_role;

-- ============================================================
-- submit_order_rating (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_order_rating(
  p_order_id   uuid,
  p_rater_type public.party_type,
  p_ratee_type public.party_type,
  p_ratee_id   uuid,
  p_stars      smallint,
  p_tags       text[] DEFAULT '{}',
  p_comment    text   DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_stars < 1 OR p_stars > 5 THEN
    RAISE EXCEPTION 'Stars must be 1-5';
  END IF;

  INSERT INTO public.order_ratings(
    order_id, rater_type, rater_id, ratee_type, ratee_id, stars, tags, comment
  )
  VALUES (
    p_order_id, p_rater_type, auth.uid(), p_ratee_type, p_ratee_id, p_stars,
    COALESCE(p_tags, '{}'), NULLIF(p_comment, '')
  )
  ON CONFLICT (order_id, rater_type, ratee_type)
  DO UPDATE SET
    stars      = EXCLUDED.stars,
    tags       = EXCLUDED.tags,
    comment    = EXCLUDED.comment,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_order_rating(uuid, public.party_type, public.party_type, uuid, smallint, text[], text) TO authenticated;

-- ============================================================
-- submit_trust_report (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_trust_report(
  p_order_id      uuid,
  p_reporter_type public.party_type,
  p_reported_type public.party_type,
  p_reported_id   uuid,
  p_category      text,
  p_severity      public.trust_report_severity,
  p_description   text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF coalesce(btrim(p_description), '') = '' THEN
    RAISE EXCEPTION 'Description required';
  END IF;

  INSERT INTO public.trust_reports(
    order_id, reporter_type, reporter_id, reported_type, reported_id,
    category, severity, description
  )
  VALUES (
    p_order_id, p_reporter_type, auth.uid(), p_reported_type, p_reported_id,
    p_category, COALESCE(p_severity, 'medium'), p_description
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_trust_report(uuid, public.party_type, public.party_type, uuid, text, public.trust_report_severity, text) TO authenticated;
