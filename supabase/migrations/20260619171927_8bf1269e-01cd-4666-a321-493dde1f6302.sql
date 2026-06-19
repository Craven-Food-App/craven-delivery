
ALTER TABLE public.cx_job_stops
  ADD COLUMN IF NOT EXISTS signature_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS package_label text,
  ADD COLUMN IF NOT EXISTS package_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_photo_url text,
  ADD COLUMN IF NOT EXISTS dropoff_photo_url text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS proof_notes text;

-- Dropoffs should default to requiring signature; pickup stops never do.
UPDATE public.cx_job_stops SET signature_required = false WHERE stop_type = 'pickup';
