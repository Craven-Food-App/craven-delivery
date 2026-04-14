
-- Sync executive_documents file_url with regenerated URLs from executive_appointments
-- For appointment cafc8566-2534-4eb8-8652-6b40903b747f (Torrance Stroman CEO)

UPDATE public.executive_documents ed
SET file_url = CASE ed.type
    WHEN 'certificate' THEN ea.certificate_url
    WHEN 'board_resolution' THEN ea.board_resolution_url
    WHEN 'bylaws' THEN ea.bylaws_url
    WHEN 'bylaws_acknowledgment' THEN ea.bylaws_acknowledgment_url
    WHEN 'appointment_letter' THEN ea.appointment_letter_url
    WHEN 'confidentiality_ip' THEN ea.confidentiality_ip_url
    WHEN 'employment_agreement' THEN ea.employment_agreement_url
    WHEN 'fiduciary_ethics' THEN ea.fiduciary_ethics_url
    WHEN 'conflict_disclosure' THEN ea.conflict_disclosure_url
    WHEN 'officer_indemnification' THEN ea.officer_indemnification_url
    WHEN 'deferred_compensation' THEN ea.deferred_compensation_url
    WHEN 'stock_subscription' THEN ea.stock_subscription_url
    WHEN 'equity_plan' THEN ea.equity_plan_url
    WHEN 'option_rsu_award' THEN ea.option_rsu_award_url
    ELSE ed.file_url
  END
FROM public.executive_appointments ea
WHERE ed.appointment_id = ea.id
  AND ea.id = 'cafc8566-2534-4eb8-8652-6b40903b747f';

-- Also clear signed_file_url for unsigned docs to ensure clean state
-- (already-signed docs keep their signed versions)
