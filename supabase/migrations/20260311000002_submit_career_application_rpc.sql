-- RPC for career site applications. Scalar args only so PostgREST never returns 400 on body.
-- Runs with definer rights. One application per IP when submitted_from_ip is set (via Edge Function).

-- Column for one-per-IP enforcement (must exist before RPC that writes it)
ALTER TABLE public.job_applicants ADD COLUMN IF NOT EXISTS submitted_from_ip text;
CREATE INDEX IF NOT EXISTS idx_job_applicants_submitted_from_ip ON public.job_applicants(submitted_from_ip) WHERE submitted_from_ip IS NOT NULL;

-- Remove all existing overloads
DROP FUNCTION IF EXISTS public.submit_career_application(text, text, text, text, text, text, integer, text, text[], text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.submit_career_application(jsonb);
DROP FUNCTION IF EXISTS public.submit_career_application(text);
DROP FUNCTION IF EXISTS public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_career_application(
  "name" text,
  "email" text,
  "phone" text DEFAULT NULL,
  linkedin_url text DEFAULT NULL,
  applicant_role text DEFAULT NULL,
  current_company text DEFAULT NULL,
  years_experience integer DEFAULT NULL,
  "location" text DEFAULT NULL,
  skills text DEFAULT NULL,
  education text DEFAULT NULL,
  summary text DEFAULT NULL,
  resume_file_path text DEFAULT NULL,
  job_posting_id text DEFAULT NULL,
  position_title text DEFAULT NULL,
  submitted_from_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_applied_date date := current_date;
  v_name text := nullif(trim("name"), '');
  v_email text := nullif(lower(trim("email")), '');
  v_skills_arr text[];
  v_ip text := nullif(trim(coalesce(submitted_from_ip, '')), '');
BEGIN
  IF v_name IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'name and email are required';
  END IF;

  -- One application per IP (enforced when IP is provided, e.g. by Edge Function)
  IF v_ip IS NOT NULL AND v_ip <> '' THEN
    IF EXISTS (SELECT 1 FROM public.job_applicants WHERE submitted_from_ip = v_ip LIMIT 1) THEN
      RAISE EXCEPTION 'ALREADY_APPLIED' USING errcode = 'P0001';
    END IF;
  END IF;

  IF skills IS NOT NULL AND trim(skills) <> '' THEN
    SELECT array_agg(trim(s)) INTO v_skills_arr
    FROM unnest(string_to_array(skills, ',')) AS s
    WHERE trim(s) <> '';
  END IF;

  INSERT INTO public.job_applicants (
    name,
    email,
    phone,
    linkedin_url,
    applicant_role,
    current_company,
    years_experience,
    location,
    skills,
    education,
    summary,
    resume_file_path,
    source,
    status,
    job_posting_id,
    applied_date,
    submitted_from_ip
  ) VALUES (
    v_name,
    v_email,
    nullif(trim(coalesce("phone", '')), ''),
    nullif(trim(coalesce(linkedin_url, '')), ''),
    nullif(trim(coalesce(applicant_role, '')), ''),
    nullif(trim(coalesce(current_company, '')), ''),
    years_experience,
    nullif(trim(coalesce("location", '')), ''),
    v_skills_arr,
    nullif(trim(coalesce(education, '')), ''),
    CASE
      WHEN nullif(trim(coalesce(position_title, '')), '') IS NOT NULL THEN
        'Applied for: ' || trim(position_title) ||
        CASE WHEN summary IS NOT NULL AND trim(summary) <> '' THEN E'\n\nCover letter:\n' || trim(summary) ELSE '' END
      ELSE nullif(trim(coalesce(summary, '')), '')
    END,
    nullif(trim(coalesce(resume_file_path, '')), ''),
    'careers_site',
    'new',
    (nullif(trim(coalesce(job_posting_id, '')), ''))::uuid,
    v_applied_date,
    v_ip
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text, text) IS 'Career application; call via Edge Function only (adds IP for one-per-IP).';

-- Only service_role (Edge Function) can call; anon must use submit-career-application Edge Function so IP is set
GRANT EXECUTE ON FUNCTION public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text, text) TO service_role;

-- Tell PostgREST to reload schema so /rest/v1/rpc/submit_career_application appears (fixes 404)
NOTIFY pgrst, 'reload schema';
