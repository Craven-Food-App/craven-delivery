-- CPO deal pipeline — data migration, columns, tasks, triggers (runs after enum migration commits).

-- 1) Migrate existing rows to new stage names
UPDATE public.partnerships SET status = 'contacted' WHERE status = 'prospect';
UPDATE public.partnerships SET status = 'in_talks' WHERE status = 'contract_review';
UPDATE public.partnerships SET status = 'negotiating' WHERE status = 'negotiation';
UPDATE public.partnerships SET status = 'signed' WHERE status = 'active';
UPDATE public.partnerships SET status = 'in_talks' WHERE status = 'on_hold';
UPDATE public.partnerships SET status = 'lost' WHERE status IN ('churned', 'terminated');

-- 2) Priority: allow "strategic"
ALTER TABLE public.partnerships DROP CONSTRAINT IF EXISTS partnerships_priority_check;
ALTER TABLE public.partnerships
  ADD CONSTRAINT partnerships_priority_check
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'strategic', 'critical'));

-- 3) New columns on partnerships
ALTER TABLE public.partnerships
  ADD COLUMN IF NOT EXISTS estimated_locations_reach integer,
  ADD COLUMN IF NOT EXISTS estimated_monthly_volume_impact text,
  ADD COLUMN IF NOT EXISTS leverage_score text CHECK (leverage_score IS NULL OR leverage_score IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS timeline_to_close date,
  ADD COLUMN IF NOT EXISTS relationship_intel text,
  ADD COLUMN IF NOT EXISTS deal_snapshot_notes text;

UPDATE public.partnerships SET stage_entered_at = COALESCE(stage_entered_at, updated_at, created_at) WHERE stage_entered_at IS NULL;

-- 4) Backfill last_activity_at from activities
UPDATE public.partnerships p
SET last_activity_at = sub.a
FROM (
  SELECT partnership_id, MAX(performed_at) AS a
  FROM public.partnership_activities
  GROUP BY partnership_id
) sub
WHERE p.id = sub.partnership_id AND (p.last_activity_at IS NULL OR p.last_activity_at < sub.a);

-- 5) Partnership tasks (next steps)
CREATE TABLE IF NOT EXISTS public.partnership_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.partnership_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage partnership_tasks" ON public.partnership_tasks;
CREATE POLICY "Authenticated users can manage partnership_tasks"
  ON public.partnership_tasks FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.partnership_tasks TO authenticated;
GRANT ALL ON public.partnership_tasks TO service_role;

-- 6) When stage changes, reset stage_entered_at
CREATE OR REPLACE FUNCTION public.partnerships_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.stage_entered_at := COALESCE(NEW.stage_entered_at, now());
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partnerships_status_stage ON public.partnerships;
CREATE TRIGGER trg_partnerships_status_stage
  BEFORE INSERT OR UPDATE ON public.partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.partnerships_on_status_change();

-- 7) Touch last_activity_at when an activity row is inserted
CREATE OR REPLACE FUNCTION public.partnerships_touch_last_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.partnerships
  SET last_activity_at = NEW.performed_at, updated_at = now()
  WHERE id = NEW.partnership_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partnership_activity_last ON public.partnership_activities;
CREATE TRIGGER trg_partnership_activity_last
  AFTER INSERT ON public.partnership_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.partnerships_touch_last_activity();

COMMENT ON TABLE public.partnership_tasks IS 'CPO deal next steps / follow-ups';
