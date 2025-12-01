-- Fortune 500 Finance Department Portal - Enterprise Schema
-- Multi-Entity, Multi-Regional, Role-Based Access Control System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MULTI-ENTITY STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(10) UNIQUE NOT NULL, -- "HQ", "US-OPS", "UK-OPS"
    entity_name TEXT NOT NULL,
    parent_entity_id UUID REFERENCES finance_entities(id),
    entity_type TEXT CHECK (entity_type IN ('parent', 'subsidiary', 'division', 'joint_venture')) NOT NULL,
    legal_structure TEXT, -- "LLC", "Corp", "Partnership"
    tax_id TEXT,
    country_code CHAR(2),
    base_currency CHAR(3) DEFAULT 'USD', -- "USD", "EUR", "GBP"
    fiscal_year_end DATE,
    reporting_standard TEXT CHECK (reporting_standard IN ('US_GAAP', 'IFRS', 'LOCAL')) DEFAULT 'US_GAAP',
    consolidation_method TEXT CHECK (consolidation_method IN ('full', 'equity', 'proportional')) DEFAULT 'full',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_finance_entities_parent ON finance_entities(parent_entity_id);
CREATE INDEX idx_finance_entities_code ON finance_entities(entity_code);

-- ENTERPRISE ROLE MANAGEMENT
-- ============================================================================

-- Always ensure a clean finance_roles definition for this migration
DROP TABLE IF EXISTS finance_roles CASCADE;

CREATE TABLE finance_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) UNIQUE NOT NULL, -- "CFO", "CONTROLLER", "AP_SPECIALIST"
    role_name TEXT NOT NULL,
    role_category TEXT CHECK (role_category IN ('executive', 'accounting', 'treasury', 'fp&a', 'tax', 'audit', 'systems')) NOT NULL,
    access_level TEXT CHECK (access_level IN ('FULL_ADMIN', 'ACCOUNTING_ADMIN', 'FP&A_ADMIN', 'PROCESSOR', 'ANALYST', 'VIEWER')) NOT NULL,
    parent_role_id UUID REFERENCES finance_roles(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert standard Fortune 500 finance roles
INSERT INTO finance_roles (role_code, role_name, role_category, access_level, description) VALUES
    ('CFO', 'Chief Financial Officer', 'executive', 'FULL_ADMIN', 'Full access to all finance modules and systems'),
    ('DEPUTY_CFO', 'Deputy CFO', 'executive', 'FULL_ADMIN', 'Full access with restricted banking'),
    ('CONTROLLER', 'Controller', 'accounting', 'ACCOUNTING_ADMIN', 'Full accounting module access'),
    ('VP_FINANCE', 'VP of Finance/FP&A', 'fp&a', 'FP&A_ADMIN', 'Full FP&A access, read-only on transactions'),
    ('SENIOR_ACCOUNTANT', 'Senior Accountant', 'accounting', 'PROCESSOR', 'Assigned accounts with approval limits'),
    ('STAFF_ACCOUNTANT', 'Staff Accountant', 'accounting', 'PROCESSOR', 'Limited posting, requires approval'),
    ('FP&A_ANALYST', 'FP&A Analyst', 'fp&a', 'ANALYST', 'Budget and forecast analysis only'),
    ('AP_SPECIALIST', 'AP Specialist', 'accounting', 'PROCESSOR', 'Accounts payable processing'),
    ('AR_SPECIALIST', 'AR Specialist', 'accounting', 'PROCESSOR', 'Accounts receivable management'),
    ('PAYROLL_SPECIALIST', 'Payroll Specialist', 'accounting', 'PROCESSOR', 'Payroll processing'),
    ('TREASURY_MANAGER', 'Treasury/Cash Manager', 'treasury', 'PROCESSOR', 'Banking and cash management'),
    ('SYSTEM_ADMIN', 'Finance Systems Administrator', 'systems', 'FULL_ADMIN', 'System configuration, no transaction access'),
    ('TAX_DIRECTOR', 'Tax Director', 'tax', 'ACCOUNTING_ADMIN', 'Tax management and compliance'),
    ('INTERNAL_AUDITOR', 'Internal Auditor', 'audit', 'VIEWER', 'Read-only audit access')
ON CONFLICT (role_code) DO NOTHING;

-- MULTI-ENTITY USER ASSIGNMENTS
-- ============================================================================

DROP TABLE IF EXISTS finance_user_roles CASCADE;

CREATE TABLE finance_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES finance_roles(id),
    entity_id UUID REFERENCES finance_entities(id), -- NULL = all entities
    region_codes TEXT[], -- ["US", "CA"] or NULL for all
    department_codes TEXT[], -- ["AP", "AR"] or NULL for all
    gl_account_ranges TEXT[], -- ["1000-1999", "2000-2999"] for account assignments
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE, -- For temporary access
    assigned_by UUID REFERENCES auth.users(id),
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- One active (approved) assignment per user+role+entity combination
CREATE UNIQUE INDEX idx_finance_user_roles_unique
  ON finance_user_roles(user_id, role_id, entity_id)
  WHERE approval_status = 'approved';

CREATE INDEX idx_finance_user_roles_user ON finance_user_roles(user_id);
CREATE INDEX idx_finance_user_roles_role ON finance_user_roles(role_id);
CREATE INDEX idx_finance_user_roles_entity ON finance_user_roles(entity_id);

-- ============================================================================
-- GRANULAR PERMISSIONS MATRIX
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- "GL", "AP", "AR", "BANKING", "PAYROLL", "BUDGET"
    action_type TEXT CHECK (action_type IN ('view', 'edit', 'post', 'approve', 'delete', 'export')) NOT NULL,
    requires_dual_approval BOOLEAN DEFAULT false,
    audit_level TEXT CHECK (audit_level IN ('standard', 'high', 'critical')) DEFAULT 'standard',
    description TEXT
);

-- Insert standard permissions
INSERT INTO finance_permissions (permission_code, permission_name, resource_type, action_type, requires_dual_approval, audit_level) VALUES
    -- GL Permissions
    ('GL_VIEW_ALL', 'View All GL Accounts', 'GL', 'view', false, 'standard'),
    ('GL_VIEW_ASSIGNED', 'View Assigned GL Accounts', 'GL', 'view', false, 'standard'),
    ('GL_EDIT', 'Edit GL Transactions', 'GL', 'edit', false, 'high'),
    ('GL_POST', 'Post Journal Entries', 'GL', 'post', false, 'critical'),
    ('GL_APPROVE', 'Approve Journal Entries', 'GL', 'approve', false, 'critical'),
    
    -- AP Permissions
    ('AP_VIEW_ALL', 'View All AP', 'AP', 'view', false, 'standard'),
    ('AP_EDIT', 'Edit AP Invoices', 'AP', 'edit', false, 'high'),
    ('AP_POST', 'Post AP Payments', 'AP', 'post', true, 'critical'),
    ('AP_APPROVE', 'Approve AP Payments', 'AP', 'approve', false, 'critical'),
    
    -- AR Permissions
    ('AR_VIEW_ALL', 'View All AR', 'AR', 'view', false, 'standard'),
    ('AR_EDIT', 'Edit AR Invoices', 'AR', 'edit', false, 'high'),
    ('AR_POST', 'Post AR Receipts', 'AR', 'post', false, 'high'),
    ('AR_APPROVE_CREDIT', 'Approve Credit Memos', 'AR', 'approve', false, 'high'),
    
    -- Banking Permissions
    ('BANKING_VIEW', 'View Bank Accounts', 'BANKING', 'view', false, 'standard'),
    ('BANKING_TRANSACT', 'Execute Banking Transactions', 'BANKING', 'post', true, 'critical'),
    ('BANKING_APPROVE', 'Approve Banking Transactions', 'BANKING', 'approve', false, 'critical'),
    
    -- Payroll Permissions
    ('PAYROLL_VIEW', 'View Payroll Data', 'PAYROLL', 'view', false, 'high'),
    ('PAYROLL_EDIT', 'Edit Payroll Data', 'PAYROLL', 'edit', true, 'critical'),
    ('PAYROLL_POST', 'Process Payroll', 'PAYROLL', 'post', true, 'critical'),
    
    -- Budget/FP&A Permissions
    ('BUDGET_VIEW_ALL', 'View All Budgets', 'BUDGET', 'view', false, 'standard'),
    ('BUDGET_EDIT', 'Edit Budget Models', 'BUDGET', 'edit', false, 'high'),
    ('BUDGET_APPROVE', 'Approve Budgets', 'BUDGET', 'approve', false, 'high'),
    
    -- System Admin Permissions
    ('SYSTEM_USER_MGMT', 'Manage Users', 'SYSTEM', 'edit', false, 'critical'),
    ('SYSTEM_CONFIG', 'System Configuration', 'SYSTEM', 'edit', true, 'critical')
ON CONFLICT (permission_code) DO NOTHING;

-- ============================================================================
-- ROLE-PERMISSION MAPPING
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_role_permissions (
    role_id UUID NOT NULL REFERENCES finance_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES finance_permissions(id) ON DELETE CASCADE,
    conditions JSONB DEFAULT '{}', -- {"max_amount": 100000, "entity_restrictions": ["US-OPS"]}
    PRIMARY KEY (role_id, permission_id)
);

-- Map CFO role to all permissions
INSERT INTO finance_role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'CFO'),
    id
FROM finance_permissions
ON CONFLICT DO NOTHING;

-- Map Controller role to accounting permissions
INSERT INTO finance_role_permissions (role_id, permission_id, conditions)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'CONTROLLER'),
    id,
    CASE 
        WHEN permission_code LIKE 'BANKING_TRANSACT%' THEN '{"requires_approval": true}'::jsonb
        WHEN permission_code LIKE 'GL_POST%' OR permission_code LIKE 'GL_APPROVE%' THEN '{"max_amount": 100000}'::jsonb
        ELSE '{}'::jsonb
    END
FROM finance_permissions
WHERE resource_type IN ('GL', 'AP', 'AR', 'PAYROLL', 'BUDGET') OR permission_code = 'BANKING_VIEW'
ON CONFLICT DO NOTHING;

-- Map AP Specialist role
INSERT INTO finance_role_permissions (role_id, permission_id, conditions)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'AP_SPECIALIST'),
    id,
    '{"max_amount": 0, "requires_approval": true}'::jsonb
FROM finance_permissions
WHERE permission_code IN ('AP_VIEW_ALL', 'AP_EDIT', 'GL_VIEW_ASSIGNED')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEGREGATION OF DUTIES (SOD) RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sod_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(100) UNIQUE NOT NULL,
    rule_name TEXT NOT NULL,
    conflicting_permissions TEXT[] NOT NULL, -- Cannot have both
    violation_severity TEXT CHECK (violation_severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    enforcement_level TEXT CHECK (enforcement_level IN ('hard', 'soft')) DEFAULT 'hard',
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Insert critical SOD rules
INSERT INTO sod_rules (rule_code, rule_name, conflicting_permissions, violation_severity, enforcement_level, description) VALUES
    ('SOD_INVOICE_PAYMENT', 'Invoice Processing vs Payment Execution', 
     ARRAY['AP_EDIT', 'AP_POST'], 'critical', 'hard',
     'User cannot both prepare invoices AND execute payments'),
    
    ('SOD_RECONCILE_POST', 'Reconciliation vs Transaction Processing',
     ARRAY['GL_VIEW_ASSIGNED', 'GL_POST'], 'high', 'hard',
     'User cannot reconcile accounts AND post to those same accounts'),
    
    ('SOD_PAYROLL_PROCESS_APPROVE', 'Payroll Processing vs Approval',
     ARRAY['PAYROLL_EDIT', 'PAYROLL_POST'], 'critical', 'hard',
     'User cannot process payroll AND approve payroll runs'),
    
    ('SOD_JE_CREATE_APPROVE', 'Journal Entry Creation vs Approval',
     ARRAY['GL_EDIT', 'GL_POST', 'GL_APPROVE'], 'high', 'hard',
     'User cannot create journal entries AND approve their own entries'),
    
    ('SOD_BANKING_DUAL', 'Banking Dual Control',
     ARRAY['BANKING_TRANSACT'], 'critical', 'hard',
     'All banking transactions require dual approval')
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================================
-- APPROVAL WORKFLOW ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(100) UNIQUE NOT NULL,
    workflow_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- "expense_report", "vendor_payment", "journal_entry", "wire_transfer"
    entity_id UUID REFERENCES finance_entities(id), -- NULL = all entities
    amount_thresholds JSONB NOT NULL, -- [{"min": 0, "max": 10000, "approver_role": "SENIOR_ACCOUNTANT"}, ...]
    requires_dual_approval BOOLEAN DEFAULT false,
    escalation_rules JSONB DEFAULT '{"hours": 48, "escalate_to": "CONTROLLER"}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert standard approval workflows
INSERT INTO approval_workflow_definitions (workflow_code, workflow_name, transaction_type, amount_thresholds, requires_dual_approval) VALUES
    ('EXPENSE_REPORT', 'Expense Report Approval',
     'expense_report',
     '[{"min": 0, "max": 1000, "approver_role": "STAFF_ACCOUNTANT"}, {"min": 1000, "max": 5000, "approver_role": "SENIOR_ACCOUNTANT"}, {"min": 5000, "max": 10000, "approver_role": "CONTROLLER"}, {"min": 10000, "max": null, "approver_role": "CFO", "requires_dual": true}]'::jsonb,
     false),
    
    ('VENDOR_PAYMENT', 'Vendor Payment Approval',
     'vendor_payment',
     '[{"min": 0, "max": 10000, "approver_role": "SENIOR_ACCOUNTANT"}, {"min": 10000, "max": 50000, "approver_role": "CONTROLLER"}, {"min": 50000, "max": null, "approver_role": "CFO", "requires_dual": true}]'::jsonb,
     false),
    
    ('JOURNAL_ENTRY', 'Journal Entry Approval',
     'journal_entry',
     '[{"min": 0, "max": 10000, "approver_role": "SENIOR_ACCOUNTANT"}, {"min": 10000, "max": 100000, "approver_role": "CONTROLLER"}, {"min": 100000, "max": null, "approver_role": "CFO", "requires_dual": true}]'::jsonb,
     false),
    
    ('WIRE_TRANSFER', 'Wire Transfer Approval',
     'wire_transfer',
     '[{"min": 0, "max": 100000, "approver_role": "CONTROLLER"}, {"min": 100000, "max": 500000, "approver_role": "CFO"}, {"min": 500000, "max": null, "approver_role": "CFO", "requires_dual": true}]'::jsonb,
     true),
    
    ('PAYROLL_PROCESSING', 'Payroll Processing Approval',
     'payroll_processing',
     '[{"min": 0, "max": null, "approver_role": "CONTROLLER"}]'::jsonb,
     false)
ON CONFLICT (workflow_code) DO NOTHING;

-- ============================================================================
-- APPROVAL QUEUE (Enterprise Scale)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    transaction_type TEXT NOT NULL,
    entity_id UUID REFERENCES finance_entities(id),
    amount NUMERIC(18,2),
    currency CHAR(3) DEFAULT 'USD',
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    current_approver_role TEXT,
    current_approver_user_id UUID REFERENCES auth.users(id),
    approval_level INTEGER DEFAULT 1, -- 1, 2, 3 for multi-level
    total_approval_levels INTEGER DEFAULT 1,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled')) DEFAULT 'pending',
    due_date TIMESTAMPTZ, -- Auto-escalate after this
    workflow_definition_id UUID REFERENCES approval_workflow_definitions(id),
    approval_history JSONB DEFAULT '[]'::jsonb, -- Track all approvals/rejections
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional transaction context
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_approval_queue_status ON approval_queue(status);
CREATE INDEX idx_approval_queue_approver ON approval_queue(current_approver_user_id);
CREATE INDEX idx_approval_queue_requested ON approval_queue(requested_by);
CREATE INDEX idx_approval_queue_entity ON approval_queue(entity_id);

-- ============================================================================
-- TRANSACTION LIMITS BY ROLE AND ENTITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES finance_roles(id),
    entity_id UUID REFERENCES finance_entities(id), -- NULL = all entities
    transaction_type TEXT NOT NULL,
    max_amount NUMERIC(18,2),
    currency CHAR(3) DEFAULT 'USD',
    period_type TEXT CHECK (period_type IN ('transaction', 'daily', 'monthly')) DEFAULT 'transaction',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default transaction limits
INSERT INTO transaction_limits (role_id, transaction_type, max_amount, period_type)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'STAFF_ACCOUNTANT'),
    'journal_entry',
    10000,
    'transaction'
ON CONFLICT DO NOTHING;

INSERT INTO transaction_limits (role_id, transaction_type, max_amount, period_type)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'SENIOR_ACCOUNTANT'),
    'journal_entry',
    100000,
    'transaction'
ON CONFLICT DO NOTHING;

INSERT INTO transaction_limits (role_id, transaction_type, max_amount, period_type)
SELECT 
    (SELECT id FROM finance_roles WHERE role_code = 'TREASURY_MANAGER'),
    'wire_transfer',
    500000,
    'transaction'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GL ACCOUNT ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS gl_account_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number TEXT NOT NULL, -- Reference to chart of accounts
    account_name TEXT,
    entity_id UUID REFERENCES finance_entities(id),
    assigned_user_id UUID REFERENCES auth.users(id),
    assignment_type TEXT CHECK (assignment_type IN ('owner', 'reviewer', 'viewer')) NOT NULL,
    access_level TEXT CHECK (access_level IN ('full', 'read_only', 'reconciliation_only')) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gl_account_assignments_user ON gl_account_assignments(assigned_user_id);
CREATE INDEX idx_gl_account_assignments_account ON gl_account_assignments(account_number);

-- ============================================================================
-- COMPREHENSIVE AUDIT LOG (Partitioned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_audit_log (
    id BIGSERIAL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    entity_id UUID REFERENCES finance_entities(id),
    action_type TEXT NOT NULL, -- "view", "create", "update", "delete", "approve", "reject"
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_id TEXT, -- For distributed tracing
    compliance_tag TEXT, -- "SOX", "PCI", "GDPR"
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial partition for current month
CREATE TABLE finance_audit_log_2025_01 PARTITION OF finance_audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Create index on partition
CREATE INDEX idx_audit_log_user_time ON finance_audit_log_2025_01(user_id, timestamp);
CREATE INDEX idx_audit_log_resource ON finance_audit_log_2025_01(resource_type, resource_id);
CREATE INDEX idx_audit_log_compliance ON finance_audit_log_2025_01(compliance_tag) WHERE compliance_tag IS NOT NULL;

-- ============================================================================
-- ACCESS REVIEW SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type TEXT CHECK (review_type IN ('quarterly', 'annual', 'ad_hoc')) DEFAULT 'quarterly',
    status TEXT CHECK (status IN ('in_progress', 'completed', 'overdue')) DEFAULT 'in_progress',
    reviewed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    findings JSONB DEFAULT '[]'::jsonb,
    remediation_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_review_id UUID REFERENCES access_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role_id UUID REFERENCES finance_roles(id),
    entity_id UUID REFERENCES finance_entities(id),
    review_status TEXT CHECK (review_status IN ('pending', 'approved', 'revoked', 'modified')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    action_taken TEXT, -- "approved", "revoked", "modified"
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE finance_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_account_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_review_items ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to view roles and permissions (for UI)
CREATE POLICY "Authenticated users can view finance roles"
    ON finance_roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view finance permissions"
    ON finance_permissions FOR SELECT
    TO authenticated
    USING (true);

-- Users can view their own role assignments
CREATE POLICY "Users can view own finance roles"
    ON finance_user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- CFO and System Admin can manage all
CREATE POLICY "CFO can manage all finance roles"
    ON finance_user_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM finance_user_roles fur
            JOIN finance_roles fr ON fur.role_id = fr.id
            WHERE fur.user_id = auth.uid() AND fr.role_code = 'CFO'
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_finance_permission(
    p_user_id UUID,
    p_permission_code VARCHAR(100),
    p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM finance_user_roles fur
        JOIN finance_role_permissions frp ON fur.role_id = frp.role_id
        JOIN finance_permissions fp ON frp.permission_id = fp.id
        WHERE fur.user_id = p_user_id
          AND fp.permission_code = p_permission_code
          AND fur.approval_status = 'approved'
          AND (p_entity_id IS NULL OR fur.entity_id = p_entity_id OR fur.entity_id IS NULL)
          AND (fur.expiration_date IS NULL OR fur.expiration_date >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for SOD violations
CREATE OR REPLACE FUNCTION check_sod_violation(
    p_user_id UUID,
    p_permission_codes TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
    violation_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO violation_count
    FROM sod_rules sr
    WHERE sr.is_active = true
      AND sr.enforcement_level = 'hard'
      AND sr.conflicting_permissions <@ p_permission_codes  -- Contains all conflicting permissions
      AND EXISTS (
          SELECT 1
          FROM finance_user_roles fur
          JOIN finance_role_permissions frp ON fur.role_id = frp.role_id
          JOIN finance_permissions fp ON frp.permission_id = fp.id
          WHERE fur.user_id = p_user_id
            AND fp.permission_code = ANY(sr.conflicting_permissions)
            AND fur.approval_status = 'approved'
      );
    
    RETURN violation_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_finance_entities_updated_at
    BEFORE UPDATE ON finance_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_roles_updated_at
    BEFORE UPDATE ON finance_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_user_roles_updated_at
    BEFORE UPDATE ON finance_user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_queue_updated_at
    BEFORE UPDATE ON approval_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA: Create default HQ entity
-- ============================================================================

INSERT INTO finance_entities (entity_code, entity_name, entity_type, base_currency, reporting_standard)
VALUES ('HQ', 'Headquarters', 'parent', 'USD', 'US_GAAP')
ON CONFLICT (entity_code) DO NOTHING;

