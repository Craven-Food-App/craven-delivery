-- Merge Torrance Stroman appointments
-- Merge data from craven@usa.com appointment into tstroman.ceo@cravenusa.com appointment
-- This ensures all required fields are consolidated for proper document regeneration
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
-- 4. Check the output messages to confirm the merge was successful

-- First, ensure additional columns exist (if they don't already)
ALTER TABLE public.executive_appointments
ADD COLUMN IF NOT EXISTS proposed_officer_phone TEXT,
ADD COLUMN IF NOT EXISTS reporting_to TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;

-- Merge the appointments
DO $$
DECLARE
  source_appointment RECORD;
  target_appointment RECORD;
  merged_data RECORD;
BEGIN
  -- Find the source appointment (craven@usa.com)
  SELECT * INTO source_appointment
  FROM public.executive_appointments
  WHERE LOWER(proposed_officer_email) = 'craven@usa.com'
    AND LOWER(proposed_officer_name) LIKE '%torrance%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Find the target appointment (tstroman.ceo@cravenusa.com)
  SELECT * INTO target_appointment
  FROM public.executive_appointments
  WHERE LOWER(proposed_officer_email) = 'tstroman.ceo@cravenusa.com'
    AND LOWER(proposed_officer_name) LIKE '%torrance%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If both appointments exist, merge them
  IF source_appointment.id IS NOT NULL AND target_appointment.id IS NOT NULL THEN
    -- Merge strategy: Use source values where target is NULL or empty, otherwise keep target
    -- Priority: source > target (source has the complete data we want to preserve)
    
    UPDATE public.executive_appointments
    SET
      -- Basic info - use source if target is missing
      proposed_officer_name = COALESCE(NULLIF(TRIM(source_appointment.proposed_officer_name), ''), target_appointment.proposed_officer_name),
      proposed_officer_email = 'tstroman.ceo@cravenusa.com', -- Always use the target email
      proposed_officer_phone = COALESCE(
        NULLIF(TRIM(source_appointment.proposed_officer_phone), ''),
        NULLIF(TRIM(target_appointment.proposed_officer_phone), '')
      ),
      proposed_title = COALESCE(NULLIF(TRIM(source_appointment.proposed_title), ''), target_appointment.proposed_title),
      department = COALESCE(
        NULLIF(TRIM(source_appointment.department), ''),
        NULLIF(TRIM(target_appointment.department), '')
      ),
      reporting_to = COALESCE(
        NULLIF(TRIM(source_appointment.reporting_to), ''),
        NULLIF(TRIM(target_appointment.reporting_to), '')
      ),
      
      -- Appointment details
      appointment_type = COALESCE(NULLIF(TRIM(source_appointment.appointment_type), ''), target_appointment.appointment_type),
      board_meeting_date = COALESCE(source_appointment.board_meeting_date, target_appointment.board_meeting_date),
      effective_date = COALESCE(source_appointment.effective_date, target_appointment.effective_date),
      term_length_months = COALESCE(source_appointment.term_length_months, target_appointment.term_length_months),
      authority_granted = COALESCE(
        NULLIF(TRIM(source_appointment.authority_granted), ''),
        NULLIF(TRIM(target_appointment.authority_granted), '')
      ),
      
      -- Compensation - merge JSON structures intelligently
      compensation_structure = CASE
        WHEN source_appointment.compensation_structure IS NOT NULL 
          AND NULLIF(TRIM(source_appointment.compensation_structure), '') IS NOT NULL
        THEN source_appointment.compensation_structure
        ELSE target_appointment.compensation_structure
      END,
      
      -- Equity
      equity_included = COALESCE(source_appointment.equity_included, target_appointment.equity_included, false),
      equity_details = CASE
        WHEN source_appointment.equity_details IS NOT NULL 
          AND NULLIF(TRIM(source_appointment.equity_details), '') IS NOT NULL
        THEN source_appointment.equity_details
        ELSE target_appointment.equity_details
      END,
      
      -- Notes - combine both if they exist
      notes = CASE
        WHEN source_appointment.notes IS NOT NULL AND target_appointment.notes IS NOT NULL
        THEN CONCAT(
          COALESCE(NULLIF(TRIM(target_appointment.notes), ''), ''),
          CASE WHEN NULLIF(TRIM(target_appointment.notes), '') IS NOT NULL THEN E'\n\n--- Merged from craven@usa.com ---\n' ELSE '' END,
          COALESCE(NULLIF(TRIM(source_appointment.notes), ''), '')
        )
        WHEN source_appointment.notes IS NOT NULL THEN source_appointment.notes
        ELSE target_appointment.notes
      END,
      
      -- Status - keep the more advanced status
      status = CASE
        WHEN source_appointment.status = 'APPROVED' THEN 'APPROVED'
        WHEN target_appointment.status = 'APPROVED' THEN 'APPROVED'
        WHEN source_appointment.status = 'SENT_TO_BOARD' THEN 'SENT_TO_BOARD'
        WHEN target_appointment.status = 'SENT_TO_BOARD' THEN 'SENT_TO_BOARD'
        ELSE COALESCE(source_appointment.status, target_appointment.status, 'DRAFT')
      END,
      
      -- Board resolution - prefer source if exists
      board_resolution_id = COALESCE(source_appointment.board_resolution_id, target_appointment.board_resolution_id),
      
      -- Document URLs - merge: use source if target doesn't have it
      appointment_letter_url = COALESCE(
        NULLIF(TRIM(target_appointment.appointment_letter_url), ''),
        NULLIF(TRIM(source_appointment.appointment_letter_url), '')
      ),
      board_resolution_url = COALESCE(
        NULLIF(TRIM(target_appointment.board_resolution_url), ''),
        NULLIF(TRIM(source_appointment.board_resolution_url), '')
      ),
      employment_agreement_url = COALESCE(
        NULLIF(TRIM(target_appointment.employment_agreement_url), ''),
        NULLIF(TRIM(source_appointment.employment_agreement_url), '')
      ),
      certificate_url = COALESCE(
        NULLIF(TRIM(target_appointment.certificate_url), ''),
        NULLIF(TRIM(source_appointment.certificate_url), '')
      ),
      deferred_compensation_url = COALESCE(
        NULLIF(TRIM(target_appointment.deferred_compensation_url), ''),
        NULLIF(TRIM(source_appointment.deferred_compensation_url), '')
      ),
      confidentiality_ip_url = COALESCE(
        NULLIF(TRIM(target_appointment.confidentiality_ip_url), ''),
        NULLIF(TRIM(source_appointment.confidentiality_ip_url), '')
      ),
      stock_subscription_url = COALESCE(
        NULLIF(TRIM(target_appointment.stock_subscription_url), ''),
        NULLIF(TRIM(source_appointment.stock_subscription_url), '')
      ),
      
      -- Timestamps - keep the earliest created_at, update updated_at
      created_at = LEAST(
        COALESCE(source_appointment.created_at, '1970-01-01'::timestamptz),
        COALESCE(target_appointment.created_at, '1970-01-01'::timestamptz)
      ),
      updated_at = now()
    WHERE id = target_appointment.id;

    -- Delete the source appointment after successful merge
    DELETE FROM public.executive_appointments
    WHERE id = source_appointment.id;

    RAISE NOTICE 'Successfully merged appointment % (craven@usa.com) into appointment % (tstroman.ceo@cravenusa.com)', 
      source_appointment.id, target_appointment.id;
      
  ELSIF source_appointment.id IS NOT NULL AND target_appointment.id IS NULL THEN
    -- If only source exists, update its email to the target email
    UPDATE public.executive_appointments
    SET 
      proposed_officer_email = 'tstroman.ceo@cravenusa.com',
      updated_at = now()
    WHERE id = source_appointment.id;
    
    RAISE NOTICE 'Updated appointment % email from craven@usa.com to tstroman.ceo@cravenusa.com', 
      source_appointment.id;
      
  ELSIF target_appointment.id IS NOT NULL THEN
    -- Target exists but source doesn't - nothing to merge
    RAISE NOTICE 'Target appointment % exists but source appointment not found. No merge needed.', 
      target_appointment.id;
  ELSE
    -- Neither appointment found
    RAISE WARNING 'No appointments found for Torrance Stroman with emails craven@usa.com or tstroman.ceo@cravenusa.com';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.executive_appointments.proposed_officer_phone IS 'Phone number of the proposed officer';
COMMENT ON COLUMN public.executive_appointments.reporting_to IS 'Who the officer reports to (e.g., Board of Directors, CEO)';
COMMENT ON COLUMN public.executive_appointments.department IS 'Department the officer belongs to';




