-- Audit Management Tables
CREATE TABLE IF NOT EXISTS audit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('complete', 'in_progress', 'upcoming')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk Management Tables
CREATE TABLE IF NOT EXISTS risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  likelihood TEXT NOT NULL CHECK (likelihood IN ('Low', 'Medium', 'High')),
  impact TEXT NOT NULL CHECK (impact IN ('Low', 'Medium', 'High')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'monitoring')),
  mitigation TEXT,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Planning Tables
CREATE TABLE IF NOT EXISTS tax_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimated_income NUMERIC NOT NULL DEFAULT 0,
  federal_tax NUMERIC NOT NULL DEFAULT 0,
  state_tax NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  effective_rate NUMERIC NOT NULL DEFAULT 0,
  tax_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  due_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('paid', 'upcoming', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_name TEXT NOT NULL,
  credit_type TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('Eligible', 'Under Review', 'Not Eligible')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Controls Tables
CREATE TABLE IF NOT EXISTS financial_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'testing' CHECK (status IN ('effective', 'deficient', 'testing', 'not_tested')),
  last_tested DATE,
  owner TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Investor Relations Tables
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name TEXT NOT NULL,
  investor_type TEXT NOT NULL,
  investment_amount NUMERIC NOT NULL DEFAULT 0,
  investment_date DATE NOT NULL,
  ownership_percent NUMERIC NOT NULL DEFAULT 0,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_title TEXT NOT NULL,
  update_content TEXT NOT NULL,
  sent_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Scenarios Tables
CREATE TABLE IF NOT EXISTS financial_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  base_revenue NUMERIC NOT NULL DEFAULT 0,
  base_expenses NUMERIC NOT NULL DEFAULT 0,
  optimistic_revenue NUMERIC NOT NULL DEFAULT 0,
  optimistic_expenses NUMERIC NOT NULL DEFAULT 0,
  pessimistic_revenue NUMERIC NOT NULL DEFAULT 0,
  pessimistic_expenses NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Capital Structure Tables
CREATE TABLE IF NOT EXISTS capital_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  holders TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debt_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_type TEXT NOT NULL,
  principal NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  maturity_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'restructured')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_instruments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (CFO access)
CREATE POLICY "CFO can view audit_requests" ON audit_requests FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage audit_requests" ON audit_requests FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view audit_timeline" ON audit_timeline FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage audit_timeline" ON audit_timeline FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view risk_register" ON risk_register FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage risk_register" ON risk_register FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view tax_estimates" ON tax_estimates FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage tax_estimates" ON tax_estimates FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view tax_calendar" ON tax_calendar FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage tax_calendar" ON tax_calendar FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view tax_credits" ON tax_credits FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage tax_credits" ON tax_credits FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view financial_controls" ON financial_controls FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage financial_controls" ON financial_controls FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view investors" ON investors FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage investors" ON investors FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view investor_updates" ON investor_updates FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage investor_updates" ON investor_updates FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view financial_scenarios" ON financial_scenarios FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage financial_scenarios" ON financial_scenarios FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view capital_stack" ON capital_stack FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage capital_stack" ON capital_stack FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));

CREATE POLICY "CFO can view debt_instruments" ON debt_instruments FOR SELECT USING (has_permission(auth.uid(), 'cfo.view'));
CREATE POLICY "CFO can manage debt_instruments" ON debt_instruments FOR ALL USING (has_permission(auth.uid(), 'cfo.view'));