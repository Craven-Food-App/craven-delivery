-- ============================================
-- OPERATIONAL GENERAL LEDGER SYSTEM
-- ============================================
-- This migration creates the necessary tables for a fully operational
-- General Ledger system with Chart of Accounts, Journal Entries, and Entry Lines

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE, -- e.g., '1000', '4000', '6000'
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  parent_account_id UUID REFERENCES public.chart_of_accounts(id),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false, -- System accounts cannot be deleted
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE, -- Auto-generated: JE-2025-001
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed', 'cancelled')),
  
  -- Totals (calculated from lines)
  total_debits NUMERIC(15, 2) DEFAULT 0,
  total_credits NUMERIC(15, 2) DEFAULT 0,
  
  -- Posting information
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  reversed_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversal_entry_id UUID REFERENCES public.journal_entries(id), -- Link to reversal entry
  
  -- Approval (if needed)
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  entity_code TEXT DEFAULT 'HQ', -- For multi-entity support
  period TEXT, -- YYYY-MM format
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Journal Entry Lines (debits/credits)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  line_number INTEGER NOT NULL, -- Order within the entry
  description TEXT,
  
  -- Amounts
  debit_amount NUMERIC(15, 2) DEFAULT 0,
  credit_amount NUMERIC(15, 2) DEFAULT 0,
  
  -- Reference information
  reference_type TEXT, -- 'expense_request', 'invoice', 'manual', etc.
  reference_id UUID, -- ID of the source document
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure only one of debit or credit has a value
  CONSTRAINT check_debit_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Account Balances (for quick lookups)
CREATE TABLE IF NOT EXISTS public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- YYYY-MM format
  opening_balance NUMERIC(15, 2) DEFAULT 0,
  period_debits NUMERIC(15, 2) DEFAULT 0,
  period_credits NUMERIC(15, 2) DEFAULT 0,
  closing_balance NUMERIC(15, 2) GENERATED ALWAYS AS (
    opening_balance + period_debits - period_credits
  ) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(account_id, period)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_chart_of_accounts_code ON public.chart_of_accounts(account_code);
CREATE INDEX idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_active ON public.chart_of_accounts(is_active) WHERE is_active = true;

CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_journal_entries_period ON public.journal_entries(period);
CREATE INDEX idx_journal_entries_entry_number ON public.journal_entries(entry_number);

CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_journal_entry_lines_reference ON public.journal_entry_lines(reference_type, reference_id);

CREATE INDEX idx_account_balances_account ON public.account_balances(account_id);
CREATE INDEX idx_account_balances_period ON public.account_balances(period);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate journal entry number
CREATE OR REPLACE FUNCTION generate_journal_entry_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.journal_entries
  WHERE entry_number LIKE 'JE-' || year_part || '-%';
  
  RETURN 'JE-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate entry number
CREATE OR REPLACE FUNCTION set_journal_entry_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number := generate_journal_entry_number();
  END IF;
  
  -- Set period from entry_date
  IF NEW.period IS NULL THEN
    NEW.period := TO_CHAR(NEW.entry_date, 'YYYY-MM');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_journal_entry_number
BEFORE INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION set_journal_entry_number();

-- Calculate and update journal entry totals
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
  entry_id UUID;
  total_debits NUMERIC(15, 2);
  total_credits NUMERIC(15, 2);
BEGIN
  -- Determine which entry to update
  IF TG_OP = 'DELETE' THEN
    entry_id := OLD.journal_entry_id;
  ELSE
    entry_id := NEW.journal_entry_id;
  END IF;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debits, total_credits
  FROM public.journal_entry_lines
  WHERE journal_entry_id = entry_id;
  
  -- Update journal entry
  UPDATE public.journal_entries
  SET 
    total_debits = total_debits,
    total_credits = total_credits,
    updated_at = now()
  WHERE id = entry_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entry_totals_after_insert
AFTER INSERT ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION update_journal_entry_totals();

CREATE TRIGGER trigger_update_entry_totals_after_update
AFTER UPDATE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION update_journal_entry_totals();

CREATE TRIGGER trigger_update_entry_totals_after_delete
AFTER DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION update_journal_entry_totals();

-- Validate journal entry balance before posting
CREATE OR REPLACE FUNCTION validate_journal_entry_balance(entry_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_debits NUMERIC(15, 2);
  total_credits NUMERIC(15, 2);
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debits, total_credits
  FROM public.journal_entry_lines
  WHERE journal_entry_id = entry_id;
  
  RETURN total_debits = total_credits AND total_debits > 0;
END;
$$ LANGUAGE plpgsql;

-- Post journal entry (updates account balances)
CREATE OR REPLACE FUNCTION post_journal_entry(entry_id UUID, posted_by_user UUID)
RETURNS BOOLEAN AS $$
DECLARE
  entry_record RECORD;
  line_record RECORD;
  period_text TEXT;
  is_balanced BOOLEAN;
BEGIN
  -- Get entry details
  SELECT * INTO entry_record
  FROM public.journal_entries
  WHERE id = entry_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found';
  END IF;
  
  IF entry_record.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft entries can be posted';
  END IF;
  
  -- Validate balance
  is_balanced := validate_journal_entry_balance(entry_id);
  IF NOT is_balanced THEN
    RAISE EXCEPTION 'Journal entry is not balanced (debits must equal credits)';
  END IF;
  
  period_text := entry_record.period;
  
  -- Process each line
  FOR line_record IN 
    SELECT * FROM public.journal_entry_lines 
    WHERE journal_entry_id = entry_id
  LOOP
    -- Update account balance for the period
    INSERT INTO public.account_balances (account_id, period, period_debits, period_credits)
    VALUES (
      line_record.account_id,
      period_text,
      line_record.debit_amount,
      line_record.credit_amount
    )
    ON CONFLICT (account_id, period) DO UPDATE SET
      period_debits = account_balances.period_debits + line_record.debit_amount,
      period_credits = account_balances.period_credits + line_record.credit_amount,
      updated_at = now();
  END LOOP;
  
  -- Update entry status
  UPDATE public.journal_entries
  SET 
    status = 'posted',
    posted_by = posted_by_user,
    posted_at = now(),
    updated_at = now()
  WHERE id = entry_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: Standard Chart of Accounts
-- ============================================

-- Assets (1000-1999)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_system_account) VALUES
  ('1000', 'Cash and Cash Equivalents', 'asset', 'debit', 'Cash on hand and in bank accounts', true),
  ('1100', 'Accounts Receivable', 'asset', 'debit', 'Amounts owed by customers', true),
  ('1200', 'Inventory', 'asset', 'debit', 'Product inventory', true),
  ('1300', 'Prepaid Expenses', 'asset', 'debit', 'Prepaid insurance, rent, etc.', true),
  ('1400', 'Property, Plant & Equipment', 'asset', 'debit', 'Fixed assets', true),
  ('1500', 'Accumulated Depreciation', 'asset', 'credit', 'Accumulated depreciation on fixed assets', true),
  ('1600', 'Intangible Assets', 'asset', 'debit', 'Goodwill, patents, trademarks', true),
  ('1700', 'Other Assets', 'asset', 'debit', 'Other non-current assets', true)
ON CONFLICT (account_code) DO NOTHING;

-- Liabilities (2000-2999)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_system_account) VALUES
  ('2000', 'Accounts Payable', 'liability', 'credit', 'Amounts owed to vendors', true),
  ('2100', 'Accrued Expenses', 'liability', 'credit', 'Accrued wages, taxes, etc.', true),
  ('2200', 'Short-term Debt', 'liability', 'credit', 'Current portion of debt', true),
  ('2300', 'Deferred Revenue', 'liability', 'credit', 'Unearned revenue', true),
  ('2400', 'Long-term Debt', 'liability', 'credit', 'Long-term loans and notes', true),
  ('2500', 'Other Liabilities', 'liability', 'credit', 'Other non-current liabilities', true)
ON CONFLICT (account_code) DO NOTHING;

-- Equity (3000-3999)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_system_account) VALUES
  ('3000', 'Common Stock', 'equity', 'credit', 'Common stock issued', true),
  ('3100', 'Additional Paid-in Capital', 'equity', 'credit', 'APIC from stock issuances', true),
  ('3200', 'Retained Earnings', 'equity', 'credit', 'Accumulated retained earnings', true),
  ('3300', 'Treasury Stock', 'equity', 'debit', 'Repurchased shares', true)
ON CONFLICT (account_code) DO NOTHING;

-- Revenue (4000-4999)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_system_account) VALUES
  ('4000', 'Sales Revenue', 'revenue', 'credit', 'Product sales revenue', true),
  ('4100', 'Service Revenue', 'revenue', 'credit', 'Service revenue', true),
  ('4200', 'Other Revenue', 'revenue', 'credit', 'Other income sources', true)
ON CONFLICT (account_code) DO NOTHING;

-- Expenses (5000-6999)
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, normal_balance, description, is_system_account) VALUES
  ('5000', 'Cost of Goods Sold', 'expense', 'debit', 'COGS', true),
  ('6000', 'Operating Expenses', 'expense', 'debit', 'General operating expenses', true),
  ('6100', 'Salaries and Wages', 'expense', 'debit', 'Employee compensation', true),
  ('6200', 'Rent Expense', 'expense', 'debit', 'Office and facility rent', true),
  ('6300', 'Utilities Expense', 'expense', 'debit', 'Electricity, water, internet', true),
  ('6400', 'Marketing Expense', 'expense', 'debit', 'Marketing and advertising', true),
  ('6500', 'Professional Services', 'expense', 'debit', 'Legal, consulting, etc.', true),
  ('6600', 'Travel Expense', 'expense', 'debit', 'Business travel', true),
  ('6700', 'Depreciation Expense', 'expense', 'debit', 'Depreciation of fixed assets', true),
  ('6800', 'Interest Expense', 'expense', 'debit', 'Interest on debt', true),
  ('6900', 'Other Expenses', 'expense', 'debit', 'Miscellaneous expenses', true)
ON CONFLICT (account_code) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

-- Chart of Accounts: CFO and Finance team can manage, others can view
CREATE POLICY "CFO and Finance can manage chart of accounts"
ON public.chart_of_accounts FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role = 'cfo'
  )
  OR EXISTS (
    SELECT 1 FROM public.finance_employees fe
    JOIN public.employees e ON fe.employee_id = e.id
    WHERE e.user_id = auth.uid() AND fe.can_view_all_financials = true
  )
);

CREATE POLICY "Anyone can view chart of accounts"
ON public.chart_of_accounts FOR SELECT
TO authenticated
USING (is_active = true);

-- Journal Entries: CFO and Finance team can manage
CREATE POLICY "CFO and Finance can manage journal entries"
ON public.journal_entries FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role = 'cfo'
  )
  OR EXISTS (
    SELECT 1 FROM public.finance_employees fe
    JOIN public.employees e ON fe.employee_id = e.id
    WHERE e.user_id = auth.uid() AND fe.can_view_all_financials = true
  )
  OR created_by = auth.uid() -- Users can view their own entries
);

-- Journal Entry Lines: Same access as journal entries
CREATE POLICY "CFO and Finance can manage journal entry lines"
ON public.journal_entry_lines FOR ALL
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role = 'cfo'
  )
  OR EXISTS (
    SELECT 1 FROM public.finance_employees fe
    JOIN public.employees e ON fe.employee_id = e.id
    WHERE e.user_id = auth.uid() AND fe.can_view_all_financials = true
  )
  OR journal_entry_id IN (
    SELECT id FROM public.journal_entries WHERE created_by = auth.uid()
  )
);

-- Account Balances: CFO and Finance team can view
CREATE POLICY "CFO and Finance can view account balances"
ON public.account_balances FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users 
    WHERE user_id = auth.uid() AND role = 'cfo'
  )
  OR EXISTS (
    SELECT 1 FROM public.finance_employees fe
    JOIN public.employees e ON fe.employee_id = e.id
    WHERE e.user_id = auth.uid() AND fe.can_view_all_financials = true
  )
);

