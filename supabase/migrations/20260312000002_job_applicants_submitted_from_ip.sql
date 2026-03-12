-- Store IP at submission so we can enforce one application per IP.
ALTER TABLE public.job_applicants
  ADD COLUMN IF NOT EXISTS submitted_from_ip text;

CREATE INDEX IF NOT EXISTS idx_job_applicants_submitted_from_ip
  ON public.job_applicants(submitted_from_ip)
  WHERE submitted_from_ip IS NOT NULL;
