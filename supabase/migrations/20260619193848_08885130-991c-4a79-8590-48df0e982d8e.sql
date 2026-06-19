
ALTER TABLE public.cx_job_stops
  ADD COLUMN IF NOT EXISTS package_weight_lbs NUMERIC,
  ADD COLUMN IF NOT EXISTS package_dimensions TEXT,
  ADD COLUMN IF NOT EXISTS package_image_url TEXT,
  ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER DEFAULT 1;
