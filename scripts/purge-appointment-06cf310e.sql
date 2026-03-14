-- Purge documents for appointment 06cf310e-7842-42fe-9f21-36f7535cce7b
-- Run this in Supabase Dashboard → SQL Editor. Storage files are NOT deleted (do that via Edge Function if needed).

DO $$
DECLARE
  apt_id UUID := '06cf310e-7842-42fe-9f21-36f7535cce7b';
  doc_ids UUID[];
BEGIN
  -- 1. Get executive_documents for this appointment
  SELECT ARRAY_AGG(id) INTO doc_ids
  FROM public.executive_documents
  WHERE appointment_id = apt_id;

  -- 2. Delete executive_signatures for those docs
  IF doc_ids IS NOT NULL AND array_length(doc_ids, 1) > 0 THEN
    DELETE FROM public.executive_signatures WHERE document_id = ANY(doc_ids);
    DELETE FROM public.executive_documents WHERE id = ANY(doc_ids);
    RAISE NOTICE 'Deleted executive_documents and signatures for appointment %', apt_id;
  END IF;

  -- 3. Clear all document URL columns on the appointment
  UPDATE public.executive_appointments
  SET
    appointment_letter_url = NULL,
    board_resolution_url = NULL,
    certificate_url = NULL,
    employment_agreement_url = NULL,
    deferred_compensation_url = NULL,
    confidentiality_ip_url = NULL,
    stock_subscription_url = NULL,
    pre_incorporation_consent_url = NULL,
    certificate_of_incorporation_url = NULL,
    bylaws_url = NULL,
    bylaws_acknowledgment_url = NULL,
    fiduciary_ethics_url = NULL,
    conflict_disclosure_url = NULL,
    officer_indemnification_url = NULL,
    equity_plan_url = NULL,
    option_rsu_award_url = NULL
  WHERE id = apt_id;

  RAISE NOTICE 'Cleared all document URLs on appointment %.', apt_id;
END $$;
