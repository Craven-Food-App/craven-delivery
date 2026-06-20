
CREATE TABLE IF NOT EXISTS public.cx_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edit_token uuid NOT NULL DEFAULT gen_random_uuid(),
  legal_name text, dba text, ein text, business_structure text,
  state_of_incorporation text, years_in_operation int, website text,
  business_address_line1 text, business_address_line2 text,
  business_city text, business_state text, business_zip text,
  owner_name text, owner_title text, owner_email text, owner_phone text,
  owner_mobile text, ownership_pct numeric,
  ops_contact_name text, ops_contact_email text, ops_contact_phone text,
  dispatch_contact_name text, dispatch_contact_phone text,
  service_cities text, service_zips text,
  daily_volume_capacity int, hours_of_operation text,
  vehicle_mix jsonb DEFAULT '{}'::jsonb, fleet_size int,
  driver_model text, current_clients text, verticals text,
  mvr_program boolean, mvr_provider text, drug_testing_program boolean,
  driver_onboarding_standards text, incident_reporting_process text,
  claims_history text,
  msa_signed_at timestamptz, carrier_agreement_signed_at timestamptz,
  indemnification_signed_at timestamptz,
  signature_typed text, signature_drawn_url text, signature_ip text,
  signature_payload jsonb,
  certified_truthful boolean DEFAULT false, ach_intent boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  current_step int NOT NULL DEFAULT 1,
  submitted_at timestamptz, reviewed_by uuid, reviewed_at timestamptz,
  decision_notes text, internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cx_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_applications TO authenticated;
GRANT ALL ON public.cx_applications TO service_role;
ALTER TABLE public.cx_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_cx_reviewer(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE id = _user
      AND role IN ('admin','ceo','coo','cpo','founder','president')
  )
$$;

CREATE POLICY "cx insert draft" ON public.cx_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cx select all" ON public.cx_applications
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cx update draft" ON public.cx_applications
  FOR UPDATE TO anon, authenticated
  USING (status IN ('draft','submitted','docs_pending'))
  WITH CHECK (status IN ('draft','submitted','docs_pending'));
CREATE POLICY "cx reviewers all" ON public.cx_applications
  FOR ALL TO authenticated
  USING (public.is_cx_reviewer(auth.uid()))
  WITH CHECK (public.is_cx_reviewer(auth.uid()));

CREATE TABLE IF NOT EXISTS public.cx_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.cx_applications(id) ON DELETE CASCADE,
  doc_type text NOT NULL, file_url text NOT NULL, file_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  verified boolean DEFAULT false, verified_by uuid, verified_at timestamptz,
  expires_at date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_application_documents TO anon, authenticated;
GRANT ALL ON public.cx_application_documents TO service_role;
ALTER TABLE public.cx_application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cx docs all" ON public.cx_application_documents
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cx_application_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.cx_applications(id) ON DELETE CASCADE,
  company_name text NOT NULL, contact_name text, contact_email text,
  contact_phone text, relationship text, years_worked text,
  contacted_at timestamptz, contact_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cx_application_references TO anon, authenticated;
GRANT ALL ON public.cx_application_references TO service_role;
ALTER TABLE public.cx_application_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cx refs all" ON public.cx_application_references
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cx_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.cx_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL, actor_id uuid, actor_label text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cx_application_events TO anon, authenticated;
GRANT ALL ON public.cx_application_events TO service_role;
ALTER TABLE public.cx_application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cx events insert" ON public.cx_application_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cx events read" ON public.cx_application_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_cx_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_cx_app_updated_at ON public.cx_applications;
CREATE TRIGGER trg_cx_app_updated_at BEFORE UPDATE ON public.cx_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_cx_updated_at();
DROP TRIGGER IF EXISTS trg_cx_doc_updated_at ON public.cx_application_documents;
CREATE TRIGGER trg_cx_doc_updated_at BEFORE UPDATE ON public.cx_application_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_cx_updated_at();
