-- Allow source = 'careers_site' for public career applications (fixes check constraint violation).
ALTER TABLE public.job_applicants
  DROP CONSTRAINT IF EXISTS job_applicants_source_check;

ALTER TABLE public.job_applicants
  ADD CONSTRAINT job_applicants_source_check
  CHECK (source IS NULL OR source IN ('manual', 'csv', 'pdf', 'linkedin', 'careers_site'));
