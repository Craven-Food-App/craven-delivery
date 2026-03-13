-- Update link_appointment_document_to_executive to use executive_id (new schema)
-- When executive_id is set, use it and get officer_name/role from exec_users; else fall back to email lookup

CREATE OR REPLACE FUNCTION public.link_appointment_document_to_executive()
RETURNS TRIGGER AS $$
DECLARE
  exec_id UUID;
  officer_name_val TEXT;
  role_val TEXT;
  exec_doc_id UUID;
  doc_type TEXT;
  doc_url TEXT;
BEGIN
  IF NEW.pre_incorporation_consent_url IS DISTINCT FROM OLD.pre_incorporation_consent_url AND NEW.pre_incorporation_consent_url IS NOT NULL THEN
    doc_type := 'pre_incorporation_consent'; doc_url := NEW.pre_incorporation_consent_url;
  ELSIF NEW.appointment_letter_url IS DISTINCT FROM OLD.appointment_letter_url AND NEW.appointment_letter_url IS NOT NULL THEN
    doc_type := 'appointment_letter'; doc_url := NEW.appointment_letter_url;
  ELSIF NEW.board_resolution_url IS DISTINCT FROM OLD.board_resolution_url AND NEW.board_resolution_url IS NOT NULL THEN
    doc_type := 'board_resolution'; doc_url := NEW.board_resolution_url;
  ELSIF NEW.certificate_url IS DISTINCT FROM OLD.certificate_url AND NEW.certificate_url IS NOT NULL THEN
    doc_type := 'certificate'; doc_url := NEW.certificate_url;
  ELSIF NEW.employment_agreement_url IS DISTINCT FROM OLD.employment_agreement_url AND NEW.employment_agreement_url IS NOT NULL THEN
    doc_type := 'employment_agreement'; doc_url := NEW.employment_agreement_url;
  ELSIF NEW.confidentiality_ip_url IS DISTINCT FROM OLD.confidentiality_ip_url AND NEW.confidentiality_ip_url IS NOT NULL THEN
    doc_type := 'confidentiality_ip'; doc_url := NEW.confidentiality_ip_url;
  ELSIF NEW.stock_subscription_url IS DISTINCT FROM OLD.stock_subscription_url AND NEW.stock_subscription_url IS NOT NULL THEN
    doc_type := 'stock_subscription'; doc_url := NEW.stock_subscription_url;
  ELSIF NEW.deferred_compensation_url IS DISTINCT FROM OLD.deferred_compensation_url AND NEW.deferred_compensation_url IS NOT NULL THEN
    doc_type := 'deferred_compensation'; doc_url := NEW.deferred_compensation_url;
  ELSE
    RETURN NEW;
  END IF;

  -- Resolve executive from executive_id (new schema)
  IF NEW.executive_id IS NOT NULL THEN
    exec_id := NEW.executive_id;
    SELECT eu.name, COALESCE(eu.title, NEW.position) INTO officer_name_val, role_val
    FROM public.exec_users eu WHERE eu.id = NEW.executive_id;
    IF officer_name_val IS NULL THEN
      SELECT up.full_name INTO officer_name_val
      FROM public.user_profiles up
      INNER JOIN public.exec_users eu ON eu.user_id = up.user_id
      WHERE eu.id = NEW.executive_id LIMIT 1;
    END IF;
    officer_name_val := COALESCE(officer_name_val, 'Officer');
    role_val := COALESCE(role_val, NEW.position);
  END IF;

  IF exec_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO exec_doc_id FROM public.executive_documents
  WHERE appointment_id = NEW.id AND type = doc_type LIMIT 1;

  IF exec_doc_id IS NULL THEN
    INSERT INTO public.executive_documents (type, officer_name, role, executive_id, file_url, appointment_id, signature_status, status, created_at)
    VALUES (doc_type, COALESCE(officer_name_val, 'Officer'), COALESCE(role_val, NEW.position), exec_id, doc_url, NEW.id, 'pending', 'generated', now());
  ELSE
    UPDATE public.executive_documents SET file_url = doc_url, updated_at = now() WHERE id = exec_doc_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
