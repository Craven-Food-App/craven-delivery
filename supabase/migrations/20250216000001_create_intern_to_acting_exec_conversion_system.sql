-- Intern → Acting Executive Conversion System
-- State machine + eligibility gates + document generation + approvals

-- 1. Roles Catalog (reference data)
CREATE TABLE IF NOT EXISTS public.roles_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE, -- 'Intern', 'Acting Exec', 'Executive Officer'
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)), -- 1=Intern, 2=Acting, 3=Exec
  default_deferred_salary NUMERIC(12, 2),
  default_equity_target NUMERIC(5, 2), -- percentage
  authority_template TEXT, -- JSON template for authority scope
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Engagements (tracks person's journey through stages)
-- Note: person_id can reference employees.id or exec_users.id depending on your setup
CREATE TABLE IF NOT EXISTS public.promotion_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL, -- References employees.id or user_profiles.id or exec_users.id
  track TEXT CHECK (track IN ('Technology', 'Strategy/Ops', 'Operations', 'Marketing')),
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'APPLIED', 'INTERN_ACTIVE', 'ACTING_ELIGIBLE', 'ACTING_ACTIVE', 
    'EXEC_ELIGIBLE', 'EXEC_ACTIVE', 'EXITED'
  )) DEFAULT 'APPLIED',
  current_title TEXT NOT NULL,
  reports_to_person_id UUID REFERENCES public.promotion_engagements(id), -- Self-reference
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Performance Reviews
CREATE TABLE IF NOT EXISTS public.promotion_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kpi_json JSONB DEFAULT '{}'::jsonb, -- Scorecard data
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 100),
  recommendation TEXT CHECK (recommendation IN ('PROMOTE_ACTING', 'EXTEND', 'EXIT', 'HOLD')),
  reviewer_person_id UUID,
  deliverables_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Compensation Packages
CREATE TABLE IF NOT EXISTS public.promotion_comp_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE UNIQUE,
  deferred_salary_annual NUMERIC(12, 2),
  salary_accrual_start_date DATE,
  salary_activation_triggers TEXT, -- JSON or plain text
  equity_type TEXT, -- 'Options', 'RSA', 'Units'
  equity_percent_target NUMERIC(5, 2),
  vesting_schedule TEXT,
  equity_conditions TEXT, -- JSON or plain text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Conversion Documents (links to executive_documents or standalone)
CREATE TABLE IF NOT EXISTS public.promotion_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.promotion_engagements(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('INTERN_OFFER', 'ACTING_CONVERSION', 'EXEC_APPOINTMENT')),
  html_template_id TEXT, -- References document_templates.template_key
  rendered_html TEXT,
  rendered_pdf_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'VOID')) DEFAULT 'DRAFT',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Approvals
CREATE TABLE IF NOT EXISTS public.promotion_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.promotion_documents(id) ON DELETE CASCADE,
  required_role TEXT NOT NULL CHECK (required_role IN ('CEO', 'CFO', 'CTO', 'BOARD')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotion_engagements_person ON public.promotion_engagements(person_id);
CREATE INDEX IF NOT EXISTS idx_promotion_engagements_stage ON public.promotion_engagements(current_stage);
CREATE INDEX IF NOT EXISTS idx_promotion_reviews_engagement ON public.promotion_performance_reviews(engagement_id);
CREATE INDEX IF NOT EXISTS idx_promotion_reviews_rating ON public.promotion_performance_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_promotion_comp_engagement ON public.promotion_comp_packages(engagement_id);
CREATE INDEX IF NOT EXISTS idx_promotion_docs_engagement ON public.promotion_documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_promotion_docs_type ON public.promotion_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_promotion_approvals_doc ON public.promotion_approvals(document_id);

-- Enable RLS
ALTER TABLE public.roles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_comp_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view roles catalog"
  ON public.roles_catalog FOR SELECT
  USING (true);

CREATE POLICY "Executives can manage promotion engagements"
  ON public.promotion_engagements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Users can view their own engagements"
  ON public.promotion_engagements FOR SELECT
  USING (
    person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Executives can manage performance reviews"
  ON public.promotion_performance_reviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Users can view their own reviews"
  ON public.promotion_performance_reviews FOR SELECT
  USING (
    engagement_id IN (
      SELECT id FROM public.promotion_engagements 
      WHERE person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Executives can manage comp packages"
  ON public.promotion_comp_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Executives can manage promotion documents"
  ON public.promotion_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

CREATE POLICY "Users can view their own documents"
  ON public.promotion_documents FOR SELECT
  USING (
    engagement_id IN (
      SELECT id FROM public.promotion_engagements 
      WHERE person_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Executives can manage approvals"
  ON public.promotion_approvals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
  );

-- Seed roles catalog
INSERT INTO public.roles_catalog (role_name, tier, default_deferred_salary, default_equity_target, authority_template)
VALUES
  ('Intern', 1, NULL, 0, '{"scope": "read-only dashboards", "restrictions": ["no payout systems", "no banking", "no production keys"]}'),
  ('Acting Executive', 2, 120000, 0.5, '{"scope": "limited admin permissions within department", "restrictions": ["requires written approval for financial decisions"]}'),
  ('Executive Officer', 3, 150000, 2.0, '{"scope": "expanded permissions, segmented by domain", "restrictions": []}')
ON CONFLICT (role_name) DO NOTHING;

