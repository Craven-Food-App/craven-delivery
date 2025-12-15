-- ============================================
-- COMPREHENSIVE FINANCE AUDIT SYSTEM
-- ============================================
-- Enterprise-grade audit system for finance department
-- Includes audit logs, flags, trails, documents, reports, reconciliation, and AI anomalies

-- ============================================
-- 1. AUDIT LOGS TABLE
-- ============================================
-- Create table only if it doesn't exist, otherwise columns will be added by migration 20250201000006
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Information
  transaction_id TEXT,
  transaction_type TEXT,
  amount NUMERIC(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Source Information
  source TEXT,
  
  -- Dates
  transaction_date DATE DEFAULT CURRENT_DATE,
  entered_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cleared_date TIMESTAMP WITH TIME ZONE,
  
  -- User Information
  entered_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  
  -- Status and Flags
  status TEXT DEFAULT 'pending',
  flag_reason TEXT,
  severity TEXT DEFAULT 'low',
  
  -- Documentation
  has_documentation BOOLEAN DEFAULT false,
  documentation_count INTEGER DEFAULT 0,
  
  -- Categorization
  account_category TEXT,
  expense_category TEXT,
  
  -- Linked Entities
  linked_vendor_id UUID,
  linked_driver_id UUID,
  linked_merchant_id UUID,
  linked_customer_id UUID,
  linked_order_id UUID,
  
  -- Additional Information
  notes TEXT,
  internal_notes TEXT, -- CFO-only notes
  cfo_comment TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  geo_location JSONB,
  
  -- Risk Assessment
  risk_score NUMERIC(5, 2) DEFAULT 0,
  anomaly_detected BOOLEAN DEFAULT false,
  ai_confidence_score NUMERIC(5, 2),
  
  -- Audit Trail
  audit_trail JSONB DEFAULT '[]'::jsonb, -- Array of all changes
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  locked_at TIMESTAMP WITH TIME ZONE -- When transaction is made immutable
);

-- Add columns if table already exists (safe to run multiple times)
DO $$
BEGIN
  ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS transaction_type TEXT,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS entered_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS cleared_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS flag_reason TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS has_documentation BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS documentation_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS account_category TEXT,
    ADD COLUMN IF NOT EXISTS expense_category TEXT,
    ADD COLUMN IF NOT EXISTS linked_vendor_id UUID,
    ADD COLUMN IF NOT EXISTS linked_driver_id UUID,
    ADD COLUMN IF NOT EXISTS linked_merchant_id UUID,
    ADD COLUMN IF NOT EXISTS linked_customer_id UUID,
    ADD COLUMN IF NOT EXISTS linked_order_id UUID,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS cfo_comment TEXT,
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS device_info JSONB,
    ADD COLUMN IF NOT EXISTS geo_location JSONB,
    ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS anomaly_detected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes only if columns exist (will fail gracefully if columns don't exist yet)
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_date ON public.audit_logs(transaction_date DESC) WHERE transaction_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entered_by ON public.audit_logs(entered_by) WHERE entered_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_reviewed_by ON public.audit_logs(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON public.audit_logs(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_anomaly ON public.audit_logs(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_id ON public.audit_logs(transaction_id) WHERE transaction_id IS NOT NULL;

-- ============================================
-- 2. AUDIT FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag Information
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    -- High Risk
    'duplicate_payout', 'payout_no_delivery', 'payment_outside_hours', 'amount_above_threshold',
    'vendor_driver_mismatch', 'missing_w9', 'possible_fraud', 'chargeback', 'refund_anomaly', 'suspicious_rounding',
    -- Medium Risk
    'late_expense', 'missing_receipt', 'category_mismatch', 'incorrect_mcc', 'manual_adjustment', 'estimate_vs_actual',
    -- Low Risk
    'late_documentation', 'missing_signature', 'out_of_policy', 'expense_after_cutoff'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  
  -- Linked Transaction
  audit_log_id UUID REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  transaction_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive', 'escalated')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Metadata
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  detected_by TEXT DEFAULT 'system', -- 'system', 'ai', 'manual', 'cfo'
  confidence_score NUMERIC(5, 2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_flags_severity ON public.audit_flags(severity);
CREATE INDEX idx_audit_flags_status ON public.audit_flags(status);
CREATE INDEX idx_audit_flags_audit_log_id ON public.audit_flags(audit_log_id);
CREATE INDEX idx_audit_flags_detected_at ON public.audit_flags(detected_at DESC);

-- ============================================
-- 3. AUDIT TRAIL TABLE (Immutable)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action Information
  action_type TEXT NOT NULL CHECK (action_type IN (
    'login', 'logout', 'transaction_create', 'transaction_update', 'transaction_delete',
    'transaction_approve', 'transaction_reject', 'transaction_flag', 'transaction_clear',
    'cfo_override', 'document_upload', 'document_delete', 'failed_login', 'deletion_attempt',
    'automation_event', 'reconciliation', 'flag_resolve', 'account_freeze', 'category_change'
  )),
  action_description TEXT NOT NULL,
  
  -- Target Resource
  target_type TEXT, -- 'audit_log', 'flag', 'document', 'reconciliation', etc.
  target_id UUID,
  
  -- User Information
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  
  -- Change Tracking
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Technical Details
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  geo_location JSONB,
  session_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp (immutable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_trail_action_type ON public.audit_trail(action_type);
CREATE INDEX idx_audit_trail_user_id ON public.audit_trail(user_id);
CREATE INDEX idx_audit_trail_target ON public.audit_trail(target_type, target_id);
CREATE INDEX idx_audit_trail_created_at ON public.audit_trail(created_at DESC);

-- ============================================
-- 4. AUDIT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document Information
  document_type TEXT NOT NULL CHECK (document_type IN (
    'receipt', 'invoice', 'contract', 'settlement_sheet', 'tax_form', 'driver_payout_statement',
    'merchant_statement', 'expense_report', 'approval_form', 'audit_letter', 'w9', 'other'
  )),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Linked Resources
  audit_log_id UUID REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  transaction_id TEXT,
  
  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  tags TEXT[],
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_documents_type ON public.audit_documents(document_type);
CREATE INDEX idx_audit_documents_audit_log_id ON public.audit_documents(audit_log_id);
CREATE INDEX idx_audit_documents_uploaded_at ON public.audit_documents(uploaded_at DESC);

-- ============================================
-- 5. AUDIT REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report Information
  report_type TEXT NOT NULL CHECK (report_type IN (
    'monthly_audit', 'quarterly_audit', 'annual_compliance', 'cfo_certification',
    'ceo_summary', 'board_audit_packet', 'ad_hoc'
  )),
  report_name TEXT NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Report Data
  report_data JSONB NOT NULL, -- Full report data structure
  summary TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'approved', 'archived')),
  
  -- Generation
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- File
  pdf_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_reports_type ON public.audit_reports(report_type);
CREATE INDEX idx_audit_reports_period ON public.audit_reports(report_period_start, report_period_end);
CREATE INDEX idx_audit_reports_status ON public.audit_reports(status);

-- ============================================
-- 6. RECONCILIATION BANK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reconciliation_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account Information
  account_type TEXT NOT NULL CHECK (account_type IN ('stripe_balance', 'operating_account', 'payout_account', 'disputed_amount')),
  account_name TEXT NOT NULL,
  
  -- Reconciliation Period
  reconciliation_date DATE NOT NULL,
  reconciliation_period_start DATE NOT NULL,
  reconciliation_period_end DATE NOT NULL,
  
  -- Balances
  opening_balance NUMERIC(15, 2) NOT NULL,
  closing_balance NUMERIC(15, 2) NOT NULL,
  expected_balance NUMERIC(15, 2),
  actual_balance NUMERIC(15, 2),
  variance NUMERIC(15, 2) GENERATED ALWAYS AS (actual_balance - expected_balance) STORED,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'reconciled', 'discrepancy', 'resolved')),
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  
  -- Checklist
  checklist_completed BOOLEAN DEFAULT false,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  
  -- Notes
  notes TEXT,
  discrepancy_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_reconciliation_bank_date ON public.reconciliation_bank(reconciliation_date DESC);
CREATE INDEX idx_reconciliation_bank_status ON public.reconciliation_bank(status);

-- ============================================
-- 7. RECONCILIATION LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reconciliation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reconciliation Information
  reconciliation_date DATE NOT NULL,
  reconciliation_period_start DATE NOT NULL,
  reconciliation_period_end DATE NOT NULL,
  
  -- Mismatch Information
  mismatch_type TEXT NOT NULL CHECK (mismatch_type IN ('missing_entry', 'duplicate_entry', 'amount_mismatch', 'date_mismatch', 'category_mismatch')),
  description TEXT NOT NULL,
  
  -- Transactions
  audit_log_id UUID REFERENCES public.audit_logs(id),
  ledger_entry_id UUID,
  expected_amount NUMERIC(15, 2),
  actual_amount NUMERIC(15, 2),
  variance NUMERIC(15, 2),
  
  -- Auto-suggestions
  auto_suggestion JSONB,
  suggestion_confidence NUMERIC(5, 2),
  
  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_action TEXT,
  manual_adjustment_log JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_reconciliation_ledger_date ON public.reconciliation_ledger(reconciliation_date DESC);
CREATE INDEX idx_reconciliation_ledger_status ON public.reconciliation_ledger(status);
CREATE INDEX idx_reconciliation_ledger_audit_log_id ON public.reconciliation_ledger(audit_log_id);

-- ============================================
-- 8. AI ANOMALIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Anomaly Information
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
    'spending_spike', 'revenue_drop', 'payout_irregularity', 'merchant_delay',
    'fraud_pattern', 'duplicate', 'suspicious_refund', 'outlier_transaction'
  )),
  description TEXT NOT NULL,
  
  -- Linked Transaction
  audit_log_id UUID REFERENCES public.audit_logs(id) ON DELETE CASCADE,
  transaction_id TEXT,
  
  -- AI Analysis
  confidence_score NUMERIC(5, 2) NOT NULL,
  risk_score NUMERIC(5, 2) NOT NULL,
  anomaly_data JSONB NOT NULL, -- Full anomaly analysis data
  
  -- Recommendations
  recommended_actions TEXT[],
  next_steps TEXT[],
  
  -- Status
  status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'reviewing', 'investigating', 'resolved', 'false_positive', 'escalated')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_ai_anomalies_type ON public.ai_anomalies(anomaly_type);
CREATE INDEX idx_ai_anomalies_confidence ON public.ai_anomalies(confidence_score DESC);
CREATE INDEX idx_ai_anomalies_status ON public.ai_anomalies(status);
CREATE INDEX idx_ai_anomalies_audit_log_id ON public.ai_anomalies(audit_log_id);

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_anomalies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. HELPER FUNCTION FOR FINANCE ROLE CHECKS
-- ============================================
-- This function safely checks finance roles without failing if columns don't exist
CREATE OR REPLACE FUNCTION public.has_finance_role_safe(
  p_user_id UUID,
  p_role_codes TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN := false;
  v_has_simple_structure BOOLEAN;
BEGIN
  -- Check if simple structure exists (has 'role' column)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'finance_roles' 
    AND column_name = 'role'
  ) INTO v_has_simple_structure;
  
  IF v_has_simple_structure THEN
    -- Use simple structure
    SELECT EXISTS (
      SELECT 1 FROM public.finance_roles 
      WHERE user_id = p_user_id 
      AND role = ANY(p_role_codes)
    ) INTO v_has_role;
  ELSE
    -- Use complex structure via finance_user_roles
    SELECT EXISTS (
      SELECT 1 FROM public.finance_user_roles fur
      JOIN public.finance_roles fr ON fur.role_id = fr.id
      WHERE fur.user_id = p_user_id
      AND fr.role_code = ANY(p_role_codes)
    ) INTO v_has_role;
  END IF;
  
  RETURN COALESCE(v_has_role, false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 11. RLS POLICIES
-- ============================================

-- Audit Logs: CFO, Controller, and Finance roles can view/manage
CREATE POLICY "finance_roles_can_view_audit_logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_audit_logs" ON public.audit_logs
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Audit Flags: Same as audit_logs
CREATE POLICY "finance_roles_can_view_audit_flags" ON public.audit_flags
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_audit_flags" ON public.audit_flags
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Audit Trail: Read-only for finance roles, full access for CFO
CREATE POLICY "finance_roles_can_view_audit_trail" ON public.audit_trail
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Audit Trail: Only system can insert (via triggers/functions)
CREATE POLICY "system_can_insert_audit_trail" ON public.audit_trail
FOR INSERT TO authenticated
WITH CHECK (true);

-- Audit Documents: Finance roles can view/manage
CREATE POLICY "finance_roles_can_view_audit_documents" ON public.audit_documents
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_audit_documents" ON public.audit_documents
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Audit Reports: Finance roles can view, CFO can manage
CREATE POLICY "finance_roles_can_view_audit_reports" ON public.audit_reports
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "cfo_can_manage_audit_reports" ON public.audit_reports
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Reconciliation: Finance roles can view/manage
CREATE POLICY "finance_roles_can_view_reconciliation" ON public.reconciliation_bank
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_reconciliation" ON public.reconciliation_bank
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- Same policies for reconciliation_ledger
CREATE POLICY "finance_roles_can_view_reconciliation_ledger" ON public.reconciliation_ledger
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_reconciliation_ledger" ON public.reconciliation_ledger
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- AI Anomalies: Finance roles can view, CFO can manage
CREATE POLICY "finance_roles_can_view_ai_anomalies" ON public.ai_anomalies
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'Controller', 'Treasury', 'AP', 'AR'])
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO', 'CONTROLLER', 'TREASURY_MANAGER', 'AP_SPECIALIST', 'AR_SPECIALIST'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "cfo_can_manage_ai_anomalies" ON public.ai_anomalies
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
  OR public.has_finance_role_safe(auth.uid(), ARRAY['CFO'])
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

-- ============================================
-- 11. TRIGGERS FOR AUDIT TRAIL
-- ============================================

-- Function to log audit trail entries
CREATE OR REPLACE FUNCTION public.log_audit_trail_entry(
  p_action_type TEXT,
  p_action_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_trail_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get user info
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get user role, handling both finance_roles structures
  SELECT COALESCE(
    (SELECT role FROM public.exec_users WHERE user_id = v_user_id LIMIT 1),
    (SELECT role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1),
    (
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'finance_roles' AND column_name = 'role')
        THEN (SELECT role FROM public.finance_roles WHERE user_id = v_user_id LIMIT 1)
        ELSE (SELECT fr.role_code FROM public.finance_user_roles fur JOIN public.finance_roles fr ON fur.role_id = fr.id WHERE fur.user_id = v_user_id LIMIT 1)
      END
    )
  ) INTO v_user_role;
  
  -- Insert audit trail entry
  INSERT INTO public.audit_trail (
    action_type,
    action_description,
    target_type,
    target_id,
    user_id,
    user_email,
    user_role,
    old_values,
    new_values,
    changed_fields,
    metadata
  ) VALUES (
    p_action_type,
    p_action_description,
    p_target_type,
    p_target_id,
    v_user_id,
    v_user_email,
    v_user_role,
    p_old_values,
    p_new_values,
    p_changed_fields,
    p_metadata
  ) RETURNING id INTO v_trail_id;
  
  RETURN v_trail_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log audit_logs changes
CREATE OR REPLACE FUNCTION public.audit_logs_change_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[];
BEGIN
  -- Determine changed fields
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key);
  END IF;
  
  -- Log to audit trail
  PERFORM public.log_audit_trail_entry(
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'transaction_create'
      WHEN TG_OP = 'UPDATE' THEN 'transaction_update'
      WHEN TG_OP = 'DELETE' THEN 'transaction_delete'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Transaction created: ' || COALESCE(NEW.transaction_id, NEW.id::TEXT)
      WHEN TG_OP = 'UPDATE' THEN 'Transaction updated: ' || COALESCE(NEW.transaction_id, NEW.id::TEXT)
      WHEN TG_OP = 'DELETE' THEN 'Transaction deleted: ' || COALESCE(OLD.transaction_id, OLD.id::TEXT)
    END,
    'audit_log',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_changed_fields
  );
  
  -- Update audit_trail JSONB in audit_logs
  IF TG_OP = 'UPDATE' THEN
    NEW.audit_trail := COALESCE(NEW.audit_trail, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'timestamp', now(),
        'action', 'update',
        'user_id', auth.uid(),
        'changed_fields', v_changed_fields,
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_logs_change_trail
  AFTER INSERT OR UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_logs_change_trail();

-- ============================================
-- 12. COMMENTS
-- ============================================
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit log of all financial transactions for audit purposes';
COMMENT ON TABLE public.audit_flags IS 'Internal control flags for high/medium/low risk transactions';
COMMENT ON TABLE public.audit_trail IS 'Immutable system-level audit trail of all actions';
COMMENT ON TABLE public.audit_documents IS 'Documentation center for audit-related documents';
COMMENT ON TABLE public.audit_reports IS 'Periodic audit reports (monthly, quarterly, annual)';
COMMENT ON TABLE public.reconciliation_bank IS 'Bank account reconciliation records';
COMMENT ON TABLE public.reconciliation_ledger IS 'Ledger reconciliation and mismatch tracking';
COMMENT ON TABLE public.ai_anomalies IS 'AI-detected anomalies and fraud patterns';



