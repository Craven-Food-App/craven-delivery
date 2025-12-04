-- ============================================
-- FORTUNE 500 PAYROLL OPERATIONS SYSTEM
-- ============================================
-- Comprehensive operational payroll management system
-- for enterprise-grade payroll processing, tax calculations,
-- deductions, pay stub generation, and payroll reporting

-- Payroll Runs (Main payroll processing batches)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT NOT NULL UNIQUE, -- Auto-generated: PR-YYYYMMDD-######
  
  -- Pay Period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual')),
  
  -- Run Details
  run_type TEXT NOT NULL DEFAULT 'regular' CHECK (run_type IN ('regular', 'bonus', 'commission', 'adjustment', 'correction', 'termination')),
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'review', 'approved', 'processing', 'processed', 'paid', 'cancelled', 'failed')),
  
  -- Totals
  total_employees INTEGER DEFAULT 0,
  total_gross_pay NUMERIC(15, 2) DEFAULT 0,
  total_taxes NUMERIC(15, 2) DEFAULT 0,
  total_deductions NUMERIC(15, 2) DEFAULT 0,
  total_net_pay NUMERIC(15, 2) DEFAULT 0,
  total_employer_taxes NUMERIC(15, 2) DEFAULT 0,
  total_employer_contributions NUMERIC(15, 2) DEFAULT 0,
  
  -- Approval
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Processing
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT CHECK (payment_method IN ('direct_deposit', 'check', 'wire', 'ach')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Entries (Individual employee payroll records)
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Pay Period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  
  -- Earnings
  base_salary NUMERIC(15, 2) DEFAULT 0,
  hours_worked NUMERIC(10, 2) DEFAULT 0,
  overtime_hours NUMERIC(10, 2) DEFAULT 0,
  overtime_rate NUMERIC(10, 2) DEFAULT 0,
  regular_hours NUMERIC(10, 2) DEFAULT 0,
  regular_rate NUMERIC(10, 2) DEFAULT 0,
  
  -- Additional Earnings
  bonus NUMERIC(15, 2) DEFAULT 0,
  commission NUMERIC(15, 2) DEFAULT 0,
  tips NUMERIC(15, 2) DEFAULT 0,
  holiday_pay NUMERIC(15, 2) DEFAULT 0,
  vacation_pay NUMERIC(15, 2) DEFAULT 0,
  sick_pay NUMERIC(15, 2) DEFAULT 0,
  other_earnings NUMERIC(15, 2) DEFAULT 0,
  earnings_details JSONB DEFAULT '{}'::jsonb, -- Flexible earnings breakdown
  
  -- Gross Pay
  gross_pay NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Pre-Tax Deductions
  pre_tax_deductions NUMERIC(15, 2) DEFAULT 0,
  pre_tax_details JSONB DEFAULT '{}'::jsonb, -- {401k: 500, health_insurance: 200, etc.}
  
  -- Taxable Income
  taxable_income NUMERIC(15, 2) GENERATED ALWAYS AS (gross_pay - pre_tax_deductions) STORED,
  
  -- Taxes
  federal_income_tax NUMERIC(15, 2) DEFAULT 0,
  state_income_tax NUMERIC(15, 2) DEFAULT 0,
  local_income_tax NUMERIC(15, 2) DEFAULT 0,
  social_security_tax NUMERIC(15, 2) DEFAULT 0,
  medicare_tax NUMERIC(15, 2) DEFAULT 0,
  additional_medicare_tax NUMERIC(15, 2) DEFAULT 0,
  state_disability_tax NUMERIC(15, 2) DEFAULT 0,
  unemployment_tax NUMERIC(15, 2) DEFAULT 0,
  other_taxes NUMERIC(15, 2) DEFAULT 0,
  tax_details JSONB DEFAULT '{}'::jsonb, -- Flexible tax breakdown
  
  -- Total Taxes
  total_taxes NUMERIC(15, 2) GENERATED ALWAYS AS (
    COALESCE(federal_income_tax, 0) +
    COALESCE(state_income_tax, 0) +
    COALESCE(local_income_tax, 0) +
    COALESCE(social_security_tax, 0) +
    COALESCE(medicare_tax, 0) +
    COALESCE(additional_medicare_tax, 0) +
    COALESCE(state_disability_tax, 0) +
    COALESCE(unemployment_tax, 0) +
    COALESCE(other_taxes, 0)
  ) STORED,
  
  -- Post-Tax Deductions
  post_tax_deductions NUMERIC(15, 2) DEFAULT 0,
  post_tax_details JSONB DEFAULT '{}'::jsonb, -- {union_dues: 50, garnishment: 200, etc.}
  
  -- Total Deductions
  -- NOTE: Calculated at application/trigger level to avoid referencing another generated column
  total_deductions NUMERIC(15, 2) DEFAULT 0,
  
  -- Net Pay
  -- NOTE: Calculated at application/trigger level
  net_pay NUMERIC(15, 2) DEFAULT 0,
  
  -- Employer Costs
  employer_social_security NUMERIC(15, 2) DEFAULT 0,
  employer_medicare NUMERIC(15, 2) DEFAULT 0,
  employer_unemployment NUMERIC(15, 2) DEFAULT 0,
  employer_workers_comp NUMERIC(15, 2) DEFAULT 0,
  employer_benefits NUMERIC(15, 2) DEFAULT 0,
  employer_contributions NUMERIC(15, 2) DEFAULT 0,
  total_employer_cost NUMERIC(15, 2) GENERATED ALWAYS AS (
    gross_pay +
    COALESCE(employer_social_security, 0) +
    COALESCE(employer_medicare, 0) +
    COALESCE(employer_unemployment, 0) +
    COALESCE(employer_workers_comp, 0) +
    COALESCE(employer_benefits, 0) +
    COALESCE(employer_contributions, 0)
  ) STORED,
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('direct_deposit', 'check', 'wire', 'ach')),
  payment_date DATE,
  payment_reference TEXT,
  
  -- YTD Totals (Year-to-Date)
  ytd_gross_pay NUMERIC(15, 2) DEFAULT 0,
  ytd_taxes NUMERIC(15, 2) DEFAULT 0,
  ytd_deductions NUMERIC(15, 2) DEFAULT 0,
  ytd_net_pay NUMERIC(15, 2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'reviewed', 'approved', 'paid', 'cancelled')),
  
  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(payroll_run_id, employee_id)
);

-- Tax Configurations (Federal, State, Local tax rates and brackets)
CREATE TABLE IF NOT EXISTS public.payroll_tax_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type TEXT NOT NULL CHECK (tax_type IN ('federal_income', 'state_income', 'local_income', 'social_security', 'medicare', 'additional_medicare', 'unemployment', 'disability', 'other')),
  jurisdiction TEXT, -- 'US', 'CA', 'NY', 'NYC', etc.
  effective_date DATE NOT NULL,
  expiration_date DATE,
  
  -- Tax Configuration
  tax_rate NUMERIC(10, 6), -- Percentage rate (e.g., 6.2 for Social Security)
  wage_base NUMERIC(15, 2), -- Maximum taxable wage (e.g., $160,200 for SS in 2023)
  brackets JSONB, -- Tax brackets for progressive taxes
  exemptions NUMERIC(15, 2), -- Standard deduction or exemption amount
  additional_rate NUMERIC(10, 6), -- Additional tax rate (e.g., Additional Medicare Tax)
  additional_threshold NUMERIC(15, 2), -- Threshold for additional tax
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Tax Settings (W-4, state withholding, etc.)
CREATE TABLE IF NOT EXISTS public.employee_tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Federal Tax (W-4)
  filing_status TEXT CHECK (filing_status IN ('single', 'married_jointly', 'married_separately', 'head_of_household', 'qualifying_widow')),
  federal_allowances INTEGER DEFAULT 0,
  additional_federal_withholding NUMERIC(15, 2) DEFAULT 0,
  federal_exempt BOOLEAN DEFAULT false,
  
  -- State Tax
  state_code TEXT, -- Two-letter state code
  state_filing_status TEXT,
  state_allowances INTEGER DEFAULT 0,
  additional_state_withholding NUMERIC(15, 2) DEFAULT 0,
  state_exempt BOOLEAN DEFAULT false,
  
  -- Local Tax
  local_jurisdiction TEXT,
  local_filing_status TEXT,
  local_allowances INTEGER DEFAULT 0,
  additional_local_withholding NUMERIC(15, 2) DEFAULT 0,
  local_exempt BOOLEAN DEFAULT false,
  
  -- Social Security
  social_security_exempt BOOLEAN DEFAULT false,
  
  -- Medicare
  medicare_exempt BOOLEAN DEFAULT false,
  
  -- Other Settings
  tax_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Effective Dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(employee_id, effective_date)
);

-- Deduction Templates (401k, health insurance, etc.)
CREATE TABLE IF NOT EXISTS public.payroll_deduction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deduction_code TEXT NOT NULL UNIQUE,
  deduction_name TEXT NOT NULL,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('pre_tax', 'post_tax', 'employer_contribution')),
  category TEXT, -- 'retirement', 'health_insurance', 'life_insurance', 'garnishment', 'voluntary', etc.
  
  -- Calculation
  calculation_method TEXT CHECK (calculation_method IN ('fixed_amount', 'percentage', 'per_paycheck', 'annual_limit')),
  amount NUMERIC(15, 2),
  percentage NUMERIC(10, 6), -- Percentage of gross pay
  annual_limit NUMERIC(15, 2),
  
  -- Eligibility
  eligibility_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Deductions (Employee-specific deduction enrollments)
CREATE TABLE IF NOT EXISTS public.employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  deduction_template_id UUID REFERENCES public.payroll_deduction_templates(id),
  deduction_code TEXT NOT NULL,
  deduction_name TEXT NOT NULL,
  
  -- Deduction Details
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('pre_tax', 'post_tax')),
  calculation_method TEXT CHECK (calculation_method IN ('fixed_amount', 'percentage', 'per_paycheck', 'annual_limit')),
  amount NUMERIC(15, 2),
  percentage NUMERIC(10, 6),
  annual_limit NUMERIC(15, 2),
  ytd_amount NUMERIC(15, 2) DEFAULT 0,
  
  -- Effective Dates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pay Stubs (Generated pay stub records)
CREATE TABLE IF NOT EXISTS public.pay_stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id UUID NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Pay Period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  
  -- Stub Details
  stub_number TEXT NOT NULL UNIQUE, -- Auto-generated: PS-YYYYMMDD-######
  stub_pdf_url TEXT,
  stub_html TEXT,
  
  -- Totals
  gross_pay NUMERIC(15, 2) NOT NULL,
  total_deductions NUMERIC(15, 2) NOT NULL,
  net_pay NUMERIC(15, 2) NOT NULL,
  ytd_gross_pay NUMERIC(15, 2) DEFAULT 0,
  ytd_total_deductions NUMERIC(15, 2) DEFAULT 0,
  ytd_net_pay NUMERIC(15, 2) DEFAULT 0,
  
  -- Status
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivered_method TEXT, -- 'email', 'portal', 'mail'
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payroll Reports (Generated payroll reports)
CREATE TABLE IF NOT EXISTS public.payroll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE, -- Auto-generated: PRR-YYYYMMDD-######
  report_type TEXT NOT NULL CHECK (report_type IN ('payroll_summary', 'tax_report', 'deduction_report', 'ytd_report', 'custom')),
  
  -- Report Period
  report_period_start DATE,
  report_period_end DATE,
  report_date DATE NOT NULL,
  
  -- Report Details
  report_name TEXT NOT NULL,
  report_pdf_url TEXT,
  report_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'approved', 'archived')),
  
  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON public.payroll_runs(pay_period_start DESC, pay_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_date ON public.payroll_runs(pay_date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_run ON public.payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period ON public.payroll_entries(pay_period_start DESC, pay_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_status ON public.payroll_entries(status);
CREATE INDEX IF NOT EXISTS idx_tax_configs_type ON public.payroll_tax_configs(tax_type, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_tax_configs_dates ON public.payroll_tax_configs(effective_date, expiration_date);
CREATE INDEX IF NOT EXISTS idx_employee_tax_settings_employee ON public.employee_tax_settings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee ON public.employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_active ON public.employee_deductions(employee_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pay_stubs_employee ON public.pay_stubs(employee_id);
CREATE INDEX IF NOT EXISTS idx_pay_stubs_entry ON public.pay_stubs(payroll_entry_id);
CREATE INDEX IF NOT EXISTS idx_pay_stubs_period ON public.pay_stubs(pay_period_start DESC, pay_period_end DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate payroll run number
CREATE OR REPLACE FUNCTION generate_payroll_run_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.run_number IS NULL OR NEW.run_number = '' THEN
    NEW.run_number := 'PR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('payroll_run_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS payroll_run_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_payroll_run_number ON public.payroll_runs;
CREATE TRIGGER trigger_generate_payroll_run_number
  BEFORE INSERT ON public.payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION generate_payroll_run_number();

-- Auto-generate pay stub number
CREATE OR REPLACE FUNCTION generate_pay_stub_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stub_number IS NULL OR NEW.stub_number = '' THEN
    NEW.stub_number := 'PS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('pay_stub_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS pay_stub_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_pay_stub_number ON public.pay_stubs;
CREATE TRIGGER trigger_generate_pay_stub_number
  BEFORE INSERT ON public.pay_stubs
  FOR EACH ROW
  EXECUTE FUNCTION generate_pay_stub_number();

-- Auto-generate payroll report number
CREATE OR REPLACE FUNCTION generate_payroll_report_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_number IS NULL OR NEW.report_number = '' THEN
    NEW.report_number := 'PRR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('payroll_report_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS payroll_report_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_payroll_report_number ON public.payroll_reports;
CREATE TRIGGER trigger_generate_payroll_report_number
  BEFORE INSERT ON public.payroll_reports
  FOR EACH ROW
  EXECUTE FUNCTION generate_payroll_report_number();

-- Update payroll run totals when entries are added/updated
CREATE OR REPLACE FUNCTION update_payroll_run_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.payroll_runs
  SET
    total_employees = (
      SELECT COUNT(DISTINCT employee_id)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_gross_pay = (
      SELECT COALESCE(SUM(gross_pay), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_taxes = (
      SELECT COALESCE(SUM(total_taxes), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_deductions = (
      SELECT COALESCE(SUM(total_deductions), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_net_pay = (
      SELECT COALESCE(SUM(net_pay), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_employer_taxes = (
      SELECT COALESCE(SUM(employer_social_security + employer_medicare + employer_unemployment), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    total_employer_contributions = (
      SELECT COALESCE(SUM(employer_contributions), 0)
      FROM public.payroll_entries
      WHERE payroll_run_id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payroll_run_totals ON public.payroll_entries;
CREATE TRIGGER trigger_update_payroll_run_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_run_totals();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_tax_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deduction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_reports ENABLE ROW LEVEL SECURITY;

-- Policies for payroll_runs
DROP POLICY IF EXISTS "CFO and Payroll can manage payroll runs" ON public.payroll_runs;
CREATE POLICY "CFO and Payroll can manage payroll runs" ON public.payroll_runs
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "All authenticated can view payroll runs" ON public.payroll_runs;
CREATE POLICY "All authenticated can view payroll runs" ON public.payroll_runs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for payroll_entries
DROP POLICY IF EXISTS "CFO and Payroll can manage payroll entries" ON public.payroll_entries;
CREATE POLICY "CFO and Payroll can manage payroll entries" ON public.payroll_entries
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "Employees can view their own payroll entries" ON public.payroll_entries;
CREATE POLICY "Employees can view their own payroll entries" ON public.payroll_entries
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

-- Policies for payroll_tax_configs
DROP POLICY IF EXISTS "CFO and Payroll can manage tax configs" ON public.payroll_tax_configs;
CREATE POLICY "CFO and Payroll can manage tax configs" ON public.payroll_tax_configs
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "All authenticated can view tax configs" ON public.payroll_tax_configs;
CREATE POLICY "All authenticated can view tax configs" ON public.payroll_tax_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for employee_tax_settings
DROP POLICY IF EXISTS "CFO and Payroll can manage employee tax settings" ON public.employee_tax_settings;
CREATE POLICY "CFO and Payroll can manage employee tax settings" ON public.employee_tax_settings
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "Employees can view their own tax settings" ON public.employee_tax_settings;
CREATE POLICY "Employees can view their own tax settings" ON public.employee_tax_settings
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

-- Policies for payroll_deduction_templates
DROP POLICY IF EXISTS "CFO and Payroll can manage deduction templates" ON public.payroll_deduction_templates;
CREATE POLICY "CFO and Payroll can manage deduction templates" ON public.payroll_deduction_templates
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "All authenticated can view deduction templates" ON public.payroll_deduction_templates;
CREATE POLICY "All authenticated can view deduction templates" ON public.payroll_deduction_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for employee_deductions
DROP POLICY IF EXISTS "CFO and Payroll can manage employee deductions" ON public.employee_deductions;
CREATE POLICY "CFO and Payroll can manage employee deductions" ON public.employee_deductions
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "Employees can view their own deductions" ON public.employee_deductions;
CREATE POLICY "Employees can view their own deductions" ON public.employee_deductions
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

-- Policies for pay_stubs
DROP POLICY IF EXISTS "CFO and Payroll can manage pay stubs" ON public.pay_stubs;
CREATE POLICY "CFO and Payroll can manage pay stubs" ON public.pay_stubs
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "Employees can view their own pay stubs" ON public.pay_stubs;
CREATE POLICY "Employees can view their own pay stubs" ON public.pay_stubs
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
  );

-- Policies for payroll_reports
DROP POLICY IF EXISTS "CFO and Payroll can manage payroll reports" ON public.payroll_reports;
CREATE POLICY "CFO and Payroll can manage payroll reports" ON public.payroll_reports
  FOR ALL
  USING (
    auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' ILIKE '%torrance%'
    OR auth.jwt()->>'email' ILIKE '%tstroman%'
    OR EXISTS (
      SELECT 1 FROM public.exec_users
      WHERE exec_users.user_id = auth.uid()
      AND exec_users.role IN ('cfo', 'ceo')
    )
    OR EXISTS (
      SELECT 1 FROM public.finance_employees fe
      JOIN public.employees e ON fe.employee_id = e.id
      WHERE e.user_id = auth.uid()
      AND fe.can_view_all_financials = true
    )
  );

DROP POLICY IF EXISTS "All authenticated can view payroll reports" ON public.payroll_reports;
CREATE POLICY "All authenticated can view payroll reports" ON public.payroll_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA
-- ============================================

-- Seed default tax configurations (2024 rates - update as needed)
INSERT INTO public.payroll_tax_configs (tax_type, jurisdiction, effective_date, tax_rate, wage_base, description) VALUES
('social_security', 'US', '2024-01-01', 6.2, 168600.00, 'Social Security Tax - Employee portion'),
('medicare', 'US', '2024-01-01', 1.45, NULL, 'Medicare Tax - Employee portion'),
('additional_medicare', 'US', '2024-01-01', 0.9, NULL, 'Additional Medicare Tax (over $200k)'),
('unemployment', 'US', '2024-01-01', 0.6, 7000.00, 'Federal Unemployment Tax (FUTA) - Employer portion')
ON CONFLICT DO NOTHING;

