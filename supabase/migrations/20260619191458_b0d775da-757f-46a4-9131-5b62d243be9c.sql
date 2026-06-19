
ALTER TABLE public.cx_job_events
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.cx_job_stops
  ADD COLUMN IF NOT EXISTS pickup_photo_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_photo_lng numeric,
  ADD COLUMN IF NOT EXISTS dropoff_photo_lat numeric,
  ADD COLUMN IF NOT EXISTS dropoff_photo_lng numeric;
