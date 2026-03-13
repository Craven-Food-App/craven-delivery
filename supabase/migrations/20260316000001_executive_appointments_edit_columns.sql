-- Ensure executive_appointments has all columns used by the full edit form.
-- Tables created from 20260128 have executive_id/position; governance used proposed_*.
-- Add any missing columns so PATCH from the edit modal succeeds.
ALTER TABLE public.executive_appointments
  ADD COLUMN IF NOT EXISTS proposed_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS proposed_officer_email TEXT,
  ADD COLUMN IF NOT EXISTS proposed_title TEXT,
  ADD COLUMN IF NOT EXISTS proposed_officer_phone TEXT,
  ADD COLUMN IF NOT EXISTS reporting_to TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;
