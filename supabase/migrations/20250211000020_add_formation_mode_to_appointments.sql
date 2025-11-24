-- ============================================================================
-- ADD FORMATION MODE TO EXECUTIVE APPOINTMENTS
-- This migration adds support for Pre-Incorporation Consent documents
-- ============================================================================

-- Add formation_mode column to executive_appointments table
ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS formation_mode BOOLEAN DEFAULT false;

-- Add pre_incorporation_consent_url column for storing the formation document
ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS pre_incorporation_consent_url TEXT;

COMMENT ON COLUMN public.executive_appointments.formation_mode IS 'If true, this appointment is part of company formation and requires Pre-Incorporation Consent document';
COMMENT ON COLUMN public.executive_appointments.pre_incorporation_consent_url IS 'URL to Pre-Incorporation Consent document (only for formation_mode appointments)';




