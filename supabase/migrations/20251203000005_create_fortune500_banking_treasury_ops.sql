-- ============================================
-- FORTUNE 500 BANKING & TREASURY OPERATIONS SYSTEM
-- ============================================
-- Comprehensive operational banking and treasury management system
-- for enterprise-grade cash management, multi-bank operations,
-- wire transfers, ACH processing, reconciliation, and cash forecasting

-- Enhanced Bank Accounts (extends existing bank_accounts)
-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Account classification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'account_type') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN account_type TEXT CHECK (account_type IN ('checking', 'savings', 'money_market', 'sweep', 'investment', 'credit_line', 'payroll', 'operating'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'account_classification') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN account_classification TEXT CHECK (account_classification IN ('operating', 'reserve', 'payroll', 'tax', 'investment', 'sweep', 'lockbox'));
  END IF;
  
  -- Account details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'account_number_masked') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN account_number_masked TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'routing_number') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN routing_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'swift_code') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN swift_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'iban') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN iban TEXT;
  END IF;
  
  -- Balance tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'available_balance') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN available_balance NUMERIC(15, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'pending_balance') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN pending_balance NUMERIC(15, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'ledger_balance') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN ledger_balance NUMERIC(15, 2) DEFAULT 0;
  END IF;
  
  -- Reconciliation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'last_reconciled_at') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN last_reconciled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'last_reconciled_balance') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN last_reconciled_balance NUMERIC(15, 2);
  END IF;
  
  -- Limits and controls
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'daily_limit') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN daily_limit NUMERIC(15, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'transaction_limit') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN transaction_limit NUMERIC(15, 2);
  END IF;
  
  -- Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'status') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen', 'closed', 'pending'));
  END IF;
  
  -- Metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'metadata') THEN
    ALTER TABLE public.bank_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Banking Transactions
CREATE TABLE IF NOT EXISTS public.banking_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE, -- Auto-generated: BT-YYYYMMDD-######
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'adjustment', 'wire_in', 'wire_out', 'ach_in', 'ach_out', 'check', 'reversal')),
  transaction_category TEXT, -- 'payroll', 'vendor_payment', 'customer_payment', 'tax', 'loan', 'investment', etc.
  
  -- Amounts
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  exchange_rate NUMERIC(10, 6) DEFAULT 1.0, -- For multi-currency
  
  -- Dates
  transaction_date DATE NOT NULL,
  value_date DATE, -- Settlement date
  posted_date DATE,
  
  -- Description
  description TEXT NOT NULL,
  reference_number TEXT,
  check_number TEXT,
  
  -- Counterparty
  counterparty_name TEXT,
  counterparty_account TEXT,
  counterparty_bank TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'cleared', 'reconciled', 'reversed', 'failed', 'cancelled')),
  
  -- Reconciliation
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciliation_id UUID, -- References banking_reconciliations(id)
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wire Transfers
CREATE TABLE IF NOT EXISTS public.wire_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wire_number TEXT NOT NULL UNIQUE, -- Auto-generated: WIRE-YYYYMMDD-######
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  
  -- Transfer Details
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('domestic', 'international', 'fedwire', 'swift')),
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  
  -- Amounts
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
  wire_fee NUMERIC(10, 2) DEFAULT 0,
  
  -- Beneficiary
  beneficiary_name TEXT NOT NULL,
  beneficiary_account TEXT NOT NULL,
  beneficiary_bank_name TEXT NOT NULL,
  beneficiary_bank_routing TEXT, -- For domestic
  beneficiary_bank_swift TEXT, -- For international
  beneficiary_bank_address TEXT,
  beneficiary_address TEXT,
  
  -- Sender (for incoming)
  sender_name TEXT,
  sender_account TEXT,
  sender_bank_name TEXT,
  sender_bank_swift TEXT,
  
  -- Instructions
  payment_instructions TEXT,
  purpose_of_payment TEXT,
  
  -- Dates
  requested_date DATE NOT NULL,
  value_date DATE,
  executed_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'submitted', 'processing', 'completed', 'failed', 'cancelled', 'reversed')),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT true,
  approver_id UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Execution
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP WITH TIME ZONE,
  external_reference TEXT, -- Bank's reference number
  confirmation_number TEXT,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ACH Transfers
CREATE TABLE IF NOT EXISTS public.ach_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ach_number TEXT NOT NULL UNIQUE, -- Auto-generated: ACH-YYYYMMDD-######
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  
  -- Transfer Details
  ach_type TEXT NOT NULL CHECK (ach_type IN ('credit', 'debit', 'prenote', 'reversal')),
  standard_entry_class TEXT, -- 'PPD', 'CCD', 'WEB', 'TEL', 'ARC', 'BOC', etc.
  
  -- Amounts
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  ach_fee NUMERIC(10, 2) DEFAULT 0,
  
  -- Company/Originator
  company_name TEXT NOT NULL,
  company_id TEXT, -- Company Identification Number
  
  -- Receiver
  receiver_name TEXT NOT NULL,
  receiver_account TEXT NOT NULL,
  receiver_account_type TEXT CHECK (receiver_account_type IN ('checking', 'savings')),
  receiver_routing TEXT NOT NULL,
  
  -- Dates
  effective_date DATE NOT NULL,
  submitted_date DATE,
  settlement_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'submitted', 'processing', 'settled', 'returned', 'rejected', 'cancelled')),
  
  -- Return/Reject Info
  return_code TEXT,
  return_reason TEXT,
  return_date DATE,
  
  -- Approval
  requires_approval BOOLEAN DEFAULT true,
  approver_id UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Execution
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  batch_id TEXT, -- ACH batch identifier
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS public.banking_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number TEXT NOT NULL UNIQUE, -- Auto-generated: REC-YYYYMMDD-######
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  
  -- Period
  reconciliation_date DATE NOT NULL,
  statement_start_date DATE NOT NULL,
  statement_end_date DATE NOT NULL,
  
  -- Balances
  statement_ending_balance NUMERIC(15, 2) NOT NULL,
  ledger_ending_balance NUMERIC(15, 2) NOT NULL,
  adjusted_balance NUMERIC(15, 2),
  difference NUMERIC(15, 2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'reconciled', 'discrepancy', 'resolved')),
  
  -- Reconciliation Items
  outstanding_deposits NUMERIC(15, 2) DEFAULT 0,
  outstanding_withdrawals NUMERIC(15, 2) DEFAULT 0,
  bank_charges NUMERIC(15, 2) DEFAULT 0,
  bank_credits NUMERIC(15, 2) DEFAULT 0,
  errors NUMERIC(15, 2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  discrepancy_explanation TEXT,
  
  -- Completion
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bank Statements
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number TEXT NOT NULL UNIQUE, -- Auto-generated: STMT-YYYYMMDD-######
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  
  -- Statement Period
  statement_date DATE NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  
  -- Balances
  opening_balance NUMERIC(15, 2) NOT NULL,
  closing_balance NUMERIC(15, 2) NOT NULL,
  available_balance NUMERIC(15, 2),
  
  -- Summary
  total_deposits NUMERIC(15, 2) DEFAULT 0,
  total_withdrawals NUMERIC(15, 2) DEFAULT 0,
  total_fees NUMERIC(15, 2) DEFAULT 0,
  total_interest NUMERIC(15, 2) DEFAULT 0,
  
  -- File
  statement_file_url TEXT,
  statement_file_name TEXT,
  file_format TEXT, -- 'pdf', 'csv', 'ofx', 'qif', 'xlsx'
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  transaction_count INTEGER DEFAULT 0,
  
  -- Reconciliation
  reconciled BOOLEAN DEFAULT false,
  reconciliation_id UUID REFERENCES public.banking_reconciliations(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash Forecasts
CREATE TABLE IF NOT EXISTS public.cash_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_number TEXT NOT NULL UNIQUE, -- Auto-generated: FCST-YYYYMMDD-######
  
  -- Forecast Period
  forecast_date DATE NOT NULL,
  forecast_start_date DATE NOT NULL,
  forecast_end_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  
  -- Opening Balance
  opening_cash_balance NUMERIC(15, 2) NOT NULL,
  
  -- Projected Cash Flows
  projected_inflows NUMERIC(15, 2) DEFAULT 0,
  projected_outflows NUMERIC(15, 2) DEFAULT 0,
  projected_net_flow NUMERIC(15, 2) GENERATED ALWAYS AS (projected_inflows - projected_outflows) STORED,
  
  -- Ending Balance
  projected_ending_balance NUMERIC(15, 2) GENERATED ALWAYS AS (opening_cash_balance + projected_inflows - projected_outflows) STORED,
  
  -- Categories
  inflows_by_category JSONB DEFAULT '{}'::jsonb, -- {customer_payments: 10000, loans: 5000, etc.}
  outflows_by_category JSONB DEFAULT '{}'::jsonb, -- {payroll: 5000, vendor_payments: 3000, etc.}
  
  -- Assumptions
  assumptions JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'archived')),
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash Forecast Details (daily/weekly breakdown)
CREATE TABLE IF NOT EXISTS public.cash_forecast_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID REFERENCES public.cash_forecasts(id) ON DELETE CASCADE,
  
  -- Period
  period_date DATE NOT NULL,
  period_type TEXT CHECK (period_type IN ('day', 'week', 'month')),
  
  -- Projected Flows
  projected_inflow NUMERIC(15, 2) DEFAULT 0,
  projected_outflow NUMERIC(15, 2) DEFAULT 0,
  projected_balance NUMERIC(15, 2),
  
  -- Actual (updated after the fact)
  actual_inflow NUMERIC(15, 2),
  actual_outflow NUMERIC(15, 2),
  actual_balance NUMERIC(15, 2),
  variance NUMERIC(15, 2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(forecast_id, period_date)
);

-- Treasury Operations
CREATE TABLE IF NOT EXISTS public.treasury_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number TEXT NOT NULL UNIQUE, -- Auto-generated: TR-YYYYMMDD-######
  
  -- Operation Type
  operation_type TEXT NOT NULL CHECK (operation_type IN ('sweep', 'investment', 'liquidation', 'funding', 'concentration', 'disbursement', 'rebalancing')),
  
  -- Accounts
  source_account_id UUID REFERENCES public.bank_accounts(id),
  target_account_id UUID REFERENCES public.bank_accounts(id),
  
  -- Amounts
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Dates
  operation_date DATE NOT NULL,
  value_date DATE,
  executed_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'executed', 'cancelled', 'failed')),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Execution
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_banking_transactions_account ON public.banking_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_banking_transactions_date ON public.banking_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_banking_transactions_status ON public.banking_transactions(status);
CREATE INDEX IF NOT EXISTS idx_banking_transactions_type ON public.banking_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_account ON public.wire_transfers(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON public.wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_date ON public.wire_transfers(requested_date DESC);
CREATE INDEX IF NOT EXISTS idx_ach_transfers_account ON public.ach_transfers(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_ach_transfers_status ON public.ach_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ach_transfers_date ON public.ach_transfers(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON public.banking_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON public.banking_reconciliations(reconciliation_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON public.bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON public.bank_statements(statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_forecasts_date ON public.cash_forecasts(forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_forecast_details_forecast ON public.cash_forecast_details(forecast_id);
CREATE INDEX IF NOT EXISTS idx_treasury_operations_date ON public.treasury_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_operations_status ON public.treasury_operations(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate transaction number
CREATE OR REPLACE FUNCTION generate_banking_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    NEW.transaction_number := 'BT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('banking_transaction_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS banking_transaction_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_banking_transaction_number ON public.banking_transactions;
CREATE TRIGGER trigger_generate_banking_transaction_number
  BEFORE INSERT ON public.banking_transactions
  FOR EACH ROW
  EXECUTE FUNCTION generate_banking_transaction_number();

-- Auto-generate wire transfer number
CREATE OR REPLACE FUNCTION generate_wire_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wire_number IS NULL OR NEW.wire_number = '' THEN
    NEW.wire_number := 'WIRE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('wire_transfer_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS wire_transfer_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_wire_transfer_number ON public.wire_transfers;
CREATE TRIGGER trigger_generate_wire_transfer_number
  BEFORE INSERT ON public.wire_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_wire_transfer_number();

-- Auto-generate ACH transfer number
CREATE OR REPLACE FUNCTION generate_ach_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ach_number IS NULL OR NEW.ach_number = '' THEN
    NEW.ach_number := 'ACH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('ach_transfer_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ach_transfer_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_ach_transfer_number ON public.ach_transfers;
CREATE TRIGGER trigger_generate_ach_transfer_number
  BEFORE INSERT ON public.ach_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_ach_transfer_number();

-- Auto-generate reconciliation number
CREATE OR REPLACE FUNCTION generate_reconciliation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reconciliation_number IS NULL OR NEW.reconciliation_number = '' THEN
    NEW.reconciliation_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('reconciliation_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS reconciliation_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_reconciliation_number ON public.banking_reconciliations;
CREATE TRIGGER trigger_generate_reconciliation_number
  BEFORE INSERT ON public.banking_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION generate_reconciliation_number();

-- Auto-generate statement number
CREATE OR REPLACE FUNCTION generate_statement_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statement_number IS NULL OR NEW.statement_number = '' THEN
    NEW.statement_number := 'STMT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('statement_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS statement_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_statement_number ON public.bank_statements;
CREATE TRIGGER trigger_generate_statement_number
  BEFORE INSERT ON public.bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION generate_statement_number();

-- Auto-generate forecast number
CREATE OR REPLACE FUNCTION generate_forecast_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.forecast_number IS NULL OR NEW.forecast_number = '' THEN
    NEW.forecast_number := 'FCST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('forecast_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS forecast_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_forecast_number ON public.cash_forecasts;
CREATE TRIGGER trigger_generate_forecast_number
  BEFORE INSERT ON public.cash_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION generate_forecast_number();

-- Auto-generate treasury operation number
CREATE OR REPLACE FUNCTION generate_treasury_operation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_number IS NULL OR NEW.operation_number = '' THEN
    NEW.operation_number := 'TR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('treasury_operation_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS treasury_operation_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_treasury_operation_number ON public.treasury_operations;
CREATE TRIGGER trigger_generate_treasury_operation_number
  BEFORE INSERT ON public.treasury_operations
  FOR EACH ROW
  EXECUTE FUNCTION generate_treasury_operation_number();

-- Update bank account balance when transaction is posted
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_change NUMERIC(15, 2);
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    -- Determine balance change based on transaction type
    IF NEW.transaction_type IN ('deposit', 'transfer_in', 'wire_in', 'ach_in', 'interest') THEN
      balance_change := NEW.amount;
    ELSIF NEW.transaction_type IN ('withdrawal', 'transfer_out', 'wire_out', 'ach_out', 'fee') THEN
      balance_change := -NEW.amount;
    ELSE
      balance_change := 0;
    END IF;
    
    -- Update bank account balance
    UPDATE public.bank_accounts
    SET 
      current_balance = COALESCE(current_balance, 0) + balance_change,
      available_balance = COALESCE(available_balance, 0) + balance_change,
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_account_balance ON public.banking_transactions;
CREATE TRIGGER trigger_update_bank_account_balance
  AFTER UPDATE ON public.banking_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_account_balance();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.banking_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ach_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banking_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_forecast_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_operations ENABLE ROW LEVEL SECURITY;

-- Policies for banking_transactions
DROP POLICY IF EXISTS "CFO and Treasury can manage transactions" ON public.banking_transactions;
CREATE POLICY "CFO and Treasury can manage transactions" ON public.banking_transactions
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

DROP POLICY IF EXISTS "All authenticated can view transactions" ON public.banking_transactions;
CREATE POLICY "All authenticated can view transactions" ON public.banking_transactions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for wire_transfers
DROP POLICY IF EXISTS "CFO and Treasury can manage wire transfers" ON public.wire_transfers;
CREATE POLICY "CFO and Treasury can manage wire transfers" ON public.wire_transfers
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

DROP POLICY IF EXISTS "All authenticated can view wire transfers" ON public.wire_transfers;
CREATE POLICY "All authenticated can view wire transfers" ON public.wire_transfers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for ach_transfers
DROP POLICY IF EXISTS "CFO and Treasury can manage ACH transfers" ON public.ach_transfers;
CREATE POLICY "CFO and Treasury can manage ACH transfers" ON public.ach_transfers
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

DROP POLICY IF EXISTS "All authenticated can view ACH transfers" ON public.ach_transfers;
CREATE POLICY "All authenticated can view ACH transfers" ON public.ach_transfers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for banking_reconciliations
DROP POLICY IF EXISTS "CFO and Treasury can manage reconciliations" ON public.banking_reconciliations;
CREATE POLICY "CFO and Treasury can manage reconciliations" ON public.banking_reconciliations
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

DROP POLICY IF EXISTS "All authenticated can view reconciliations" ON public.banking_reconciliations;
CREATE POLICY "All authenticated can view reconciliations" ON public.banking_reconciliations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for bank_statements
DROP POLICY IF EXISTS "CFO and Treasury can manage statements" ON public.bank_statements;
CREATE POLICY "CFO and Treasury can manage statements" ON public.bank_statements
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

DROP POLICY IF EXISTS "All authenticated can view statements" ON public.bank_statements;
CREATE POLICY "All authenticated can view statements" ON public.bank_statements
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for cash_forecasts
DROP POLICY IF EXISTS "CFO and Treasury can manage forecasts" ON public.cash_forecasts;
CREATE POLICY "CFO and Treasury can manage forecasts" ON public.cash_forecasts
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

DROP POLICY IF EXISTS "All authenticated can view forecasts" ON public.cash_forecasts;
CREATE POLICY "All authenticated can view forecasts" ON public.cash_forecasts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for cash_forecast_details
DROP POLICY IF EXISTS "CFO and Treasury can manage forecast details" ON public.cash_forecast_details;
CREATE POLICY "CFO and Treasury can manage forecast details" ON public.cash_forecast_details
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

DROP POLICY IF EXISTS "All authenticated can view forecast details" ON public.cash_forecast_details;
CREATE POLICY "All authenticated can view forecast details" ON public.cash_forecast_details
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for treasury_operations
DROP POLICY IF EXISTS "CFO and Treasury can manage treasury operations" ON public.treasury_operations;
CREATE POLICY "CFO and Treasury can manage treasury operations" ON public.treasury_operations
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

DROP POLICY IF EXISTS "All authenticated can view treasury operations" ON public.treasury_operations;
CREATE POLICY "All authenticated can view treasury operations" ON public.treasury_operations
  FOR SELECT
  USING (auth.role() = 'authenticated');

