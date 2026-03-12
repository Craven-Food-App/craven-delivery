-- =============================================================================
-- ONE-SHOT: Run this in Supabase Dashboard → SQL Editor if career applications
-- return 404 (function not found). Ensures tables + RPC exist and API sees them.
-- =============================================================================

-- 1) Tables (if missing)
CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL,
  location text NOT NULL,
  description text,
  requirements text[],
  salary_min integer,
  salary_max integer,
  status text,
  posted_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid REFERENCES public.job_postings(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  linkedin_url text,
  applicant_role text,
  current_company text,
  years_experience integer,
  location text,
  skills text[],
  education text,
  summary text,
  resume_file_path text,
  resume_text text,
  source text,
  status text,
  fit_score integer,
  ai_analysis jsonb,
  applied_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_applicants_job_posting_id ON public.job_applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applicants_applied_date ON public.job_applicants(applied_date DESC);
ALTER TABLE public.job_applicants ADD COLUMN IF NOT EXISTS submitted_from_ip text;

-- 2) RLS so anon can insert, auth can read
ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.job_applicants TO anon;
DROP POLICY IF EXISTS "job_applicants_anon_insert" ON public.job_applicants;
CREATE POLICY "job_applicants_anon_insert" ON public.job_applicants FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "job_applicants_authenticated_select" ON public.job_applicants;
CREATE POLICY "job_applicants_authenticated_select" ON public.job_applicants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "job_applicants_service_select" ON public.job_applicants;
CREATE POLICY "job_applicants_service_select" ON public.job_applicants FOR SELECT TO service_role USING (true);

-- Allow source = 'careers_site' (fixes check constraint violation)
ALTER TABLE public.job_applicants DROP CONSTRAINT IF EXISTS job_applicants_source_check;
ALTER TABLE public.job_applicants ADD CONSTRAINT job_applicants_source_check
  CHECK (source IS NULL OR source IN ('manual', 'csv', 'pdf', 'linkedin', 'careers_site'));

-- 3) RPC (drop any old overloads, then create the one we use)
DROP FUNCTION IF EXISTS public.submit_career_application(text, text, text, text, text, text, integer, text, text[], text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.submit_career_application(jsonb);
DROP FUNCTION IF EXISTS public.submit_career_application(text);

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
  position_title text DEFAULT NULL
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
BEGIN
  IF v_name IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'name and email are required';
  END IF;
  IF skills IS NOT NULL AND trim(skills) <> '' THEN
    SELECT array_agg(trim(s)) INTO v_skills_arr
    FROM unnest(string_to_array(skills, ',')) AS s
    WHERE trim(s) <> '';
  END IF;
  INSERT INTO public.job_applicants (
    name, email, phone, linkedin_url, applicant_role, current_company,
    years_experience, location, skills, education, summary, resume_file_path,
    source, status, job_posting_id, applied_date
  ) VALUES (
    v_name, v_email,
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
    'careers_site', 'new',
    (nullif(trim(coalesce(job_posting_id, '')), ''))::uuid,
    v_applied_date
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_career_application(text, text, text, text, text, text, integer, text, text, text, text, text, text, text) TO service_role;

-- 4) Reload API schema so the RPC is exposed (fixes 404)
NOTIFY pgrst, 'reload schema';
