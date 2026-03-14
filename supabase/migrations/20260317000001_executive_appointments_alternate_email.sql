-- Optional alternate email for executive appointments.
-- When set, appointment documents are sent to both primary and alternate email simultaneously.
ALTER TABLE public.executive_appointments
  ADD COLUMN IF NOT EXISTS alternate_email TEXT;

COMMENT ON COLUMN public.executive_appointments.alternate_email IS 'Optional secondary email; documents are sent to both proposed_officer_email and this address when set.';
