
-- =============================================================
-- Executive Compliance / Final Activation Layer
-- Additive schema — does NOT modify existing tables except
-- adding one nullable column to executive_appointments
-- =============================================================

-- 1. Add compliance_status to executive_appointments
ALTER TABLE public.executive_appointments
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'not_started';

-- 2. Executive Compliance Intake
CREATE TABLE IF NOT EXISTS public.executive_compliance_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id uuid NOT NULL REFERENCES public.exec_users(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.executive_appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  -- Tax information (W-4 style)
  tax_filing_status text,                  -- single, married_jointly, married_separately, head_of_household
  tax_state text,                          -- state abbreviation
  federal_allowances integer DEFAULT 0,
  state_allowances integer DEFAULT 0,
  additional_withholding numeric(10,2) DEFAULT 0,
  ssn_last4 text,                          -- only last 4 digits stored here
  tax_complete boolean NOT NULL DEFAULT false,

  -- Work eligibility (I-9 style)
  citizenship_status text,                 -- us_citizen, permanent_resident, work_visa, other
  eligibility_document_type text,          -- passport, drivers_license_sscard, etc
  work_authorization_expiry date,
  eligibility_complete boolean NOT NULL DEFAULT false,

  -- Direct deposit
  bank_name text,
  account_type text,                       -- checking, savings
  routing_number_last4 text,               -- only last 4 stored
  account_number_last4 text,               -- only last 4 stored
  direct_deposit_complete boolean NOT NULL DEFAULT false,

  -- Status tracking
  compliance_status text NOT NULL DEFAULT 'not_started',
  -- Valid values: not_started, in_progress, submitted, review_pending, approved, payroll_ready

  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(appointment_id)
);

-- 3. Executive Compliance Documents
CREATE TABLE IF NOT EXISTS public.executive_compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.executive_compliance_intake(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.executive_appointments(id) ON DELETE CASCADE,
  executive_id uuid NOT NULL REFERENCES public.exec_users(id) ON DELETE CASCADE,

  document_type text NOT NULL,             -- w4_summary, i9_summary, direct_deposit_auth, compliance_acknowledgment
  document_title text NOT NULL,
  file_url text,
  signed_file_url text,
  status text NOT NULL DEFAULT 'pending',  -- pending, generated, signed, locked
  
  signed_at timestamptz,
  signed_by_user uuid,
  signature_method text,                   -- typed, drawn, uploaded
  signature_ip text,

  locked_at timestamptz,
  version integer NOT NULL DEFAULT 1,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Executive Compliance Audit Log
CREATE TABLE IF NOT EXISTS public.executive_compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid REFERENCES public.executive_compliance_intake(id) ON DELETE SET NULL,
  action text NOT NULL,                    -- created, updated, viewed, submitted, approved, rejected
  field_changed text,
  old_value text,
  new_value text,
  actor_user_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE public.executive_compliance_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Intake: exec can read/write own
CREATE POLICY "Executives can view own compliance intake"
  ON public.executive_compliance_intake FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Executives can insert own compliance intake"
  ON public.executive_compliance_intake FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Executives can update own compliance intake"
  ON public.executive_compliance_intake FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Intake: admin read all
CREATE POLICY "Admins can view all compliance intakes"
  ON public.executive_compliance_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
        AND exec_users.role IN ('ceo', 'cfo', 'coo')
    )
  );

-- Intake: admin update (for review/approval)
CREATE POLICY "Admins can update compliance intakes"
  ON public.executive_compliance_intake FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
        AND exec_users.role IN ('ceo', 'cfo', 'coo')
    )
  );

-- Compliance docs: exec can view/update own
CREATE POLICY "Executives can view own compliance documents"
  ON public.executive_compliance_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.id = executive_compliance_documents.executive_id
        AND exec_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Executives can insert own compliance documents"
  ON public.executive_compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.id = executive_compliance_documents.executive_id
        AND exec_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Executives can update own compliance documents"
  ON public.executive_compliance_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.id = executive_compliance_documents.executive_id
        AND exec_users.user_id = auth.uid()
    )
  );

-- Compliance docs: admin read all
CREATE POLICY "Admins can view all compliance documents"
  ON public.executive_compliance_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
        AND exec_users.role IN ('ceo', 'cfo', 'coo')
    )
  );

-- Audit log: insert only for authenticated, read only for admins
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.executive_compliance_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view compliance audit logs"
  ON public.executive_compliance_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
        AND exec_users.role IN ('ceo', 'cfo', 'coo')
    )
  );

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_compliance_intake_appointment ON public.executive_compliance_intake(appointment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_intake_executive ON public.executive_compliance_intake(executive_id);
CREATE INDEX IF NOT EXISTS idx_compliance_intake_user ON public.executive_compliance_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_intake ON public.executive_compliance_documents(intake_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_appointment ON public.executive_compliance_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_intake ON public.executive_compliance_audit_log(intake_id);

-- =============================================================
-- Updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_compliance_intake_updated_at
  BEFORE UPDATE ON public.executive_compliance_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();

CREATE TRIGGER update_compliance_docs_updated_at
  BEFORE UPDATE ON public.executive_compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_compliance_updated_at();
