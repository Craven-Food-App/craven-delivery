-- Add missing document URL columns to executive_appointments table for Fortune 500 workflow
-- This migration adds columns for the 8 new document types required by the 14-document Fortune 500 flow

ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS certificate_of_incorporation_url TEXT,
ADD COLUMN IF NOT EXISTS bylaws_url TEXT,
ADD COLUMN IF NOT EXISTS bylaws_acknowledgment_url TEXT,
ADD COLUMN IF NOT EXISTS fiduciary_ethics_url TEXT,
ADD COLUMN IF NOT EXISTS conflict_disclosure_url TEXT,
ADD COLUMN IF NOT EXISTS officer_indemnification_url TEXT,
ADD COLUMN IF NOT EXISTS equity_plan_url TEXT,
ADD COLUMN IF NOT EXISTS option_rsu_award_url TEXT;

-- Add comments to document the purpose of each column
COMMENT ON COLUMN public.executive_appointments.certificate_of_incorporation_url IS 'URL to Certificate of Incorporation document (formation)';
COMMENT ON COLUMN public.executive_appointments.bylaws_url IS 'URL to Company Bylaws document';
COMMENT ON COLUMN public.executive_appointments.bylaws_acknowledgment_url IS 'URL to Bylaws Acknowledgment & Personal Consent document';
COMMENT ON COLUMN public.executive_appointments.fiduciary_ethics_url IS 'URL to Fiduciary Duty & Ethics Acknowledgment document';
COMMENT ON COLUMN public.executive_appointments.conflict_disclosure_url IS 'URL to Conflict of Interest Disclosure document';
COMMENT ON COLUMN public.executive_appointments.officer_indemnification_url IS 'URL to Officer Indemnification Agreement document';
COMMENT ON COLUMN public.executive_appointments.equity_plan_url IS 'URL to Equity Incentive Plan document';
COMMENT ON COLUMN public.executive_appointments.option_rsu_award_url IS 'URL to Option/RSU Award Agreement document';