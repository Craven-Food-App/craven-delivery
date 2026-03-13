-- Add document URL and context columns to executive_appointments (new schema)
-- So backfill/generate and workflow can store and read document URLs and context
-- Officer identity comes from executive_id -> exec_users + user_profiles

ALTER TABLE public.executive_appointments
  ADD COLUMN IF NOT EXISTS appointment_letter_url TEXT,
  ADD COLUMN IF NOT EXISTS board_resolution_url TEXT,
  ADD COLUMN IF NOT EXISTS employment_agreement_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS deferred_compensation_url TEXT,
  ADD COLUMN IF NOT EXISTS confidentiality_ip_url TEXT,
  ADD COLUMN IF NOT EXISTS stock_subscription_url TEXT,
  ADD COLUMN IF NOT EXISTS pre_incorporation_consent_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_of_incorporation_url TEXT,
  ADD COLUMN IF NOT EXISTS bylaws_url TEXT,
  ADD COLUMN IF NOT EXISTS bylaws_acknowledgment_url TEXT,
  ADD COLUMN IF NOT EXISTS fiduciary_ethics_url TEXT,
  ADD COLUMN IF NOT EXISTS conflict_disclosure_url TEXT,
  ADD COLUMN IF NOT EXISTS officer_indemnification_url TEXT,
  ADD COLUMN IF NOT EXISTS equity_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS option_rsu_award_url TEXT;

ALTER TABLE public.executive_appointments
  ADD COLUMN IF NOT EXISTS equity_included BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS compensation_structure TEXT,
  ADD COLUMN IF NOT EXISTS equity_details JSONB,
  ADD COLUMN IF NOT EXISTS formation_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS board_meeting_date DATE,
  ADD COLUMN IF NOT EXISTS term_length_months INTEGER,
  ADD COLUMN IF NOT EXISTS authority_granted TEXT,
  ADD COLUMN IF NOT EXISTS term_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- resolution_id already exists on executive_appointments (FK to governance_board_resolutions).
-- Code that used board_resolution_id will be updated to use resolution_id.
