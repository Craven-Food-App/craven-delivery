-- Create job_postings and job_applicants for TalentLens / Career Applications.
-- Safe to run if tables already exist (IF NOT EXISTS).

-- job_postings: required for FK from job_applicants; can be used by HR to manage openings
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

-- job_applicants: career site submissions; HR views in TalentLens
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
CREATE INDEX IF NOT EXISTS idx_job_applicants_source ON public.job_applicants(source);
