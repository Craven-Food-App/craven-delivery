-- Phase 1: Finance RBAC - Working with existing structure
-- Add only missing tables and update existing roles

-- Create Finance Permissions (if not exists)
CREATE TABLE IF NOT EXISTS public.finance_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code TEXT UNIQUE NOT NULL,
  permission_name TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Role Permissions (if not exists)
CREATE TABLE IF NOT EXISTS public.finance_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.finance_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.finance_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create User Finance Roles (if not exists)
CREATE TABLE IF NOT EXISTS public.user_finance_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.finance_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effective_to TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create Transaction Limits (if not exists)
CREATE TABLE IF NOT EXISTS public.finance_transaction_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.finance_roles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  max_amount DECIMAL(15,2),
  requires_dual_approval BOOLEAN DEFAULT false,
  dual_approval_threshold DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.finance_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_finance_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transaction_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users view their finance roles" ON public.user_finance_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Finance admins manage roles" ON public.user_finance_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_finance_roles ufr
      JOIN public.finance_roles fr ON ufr.role_id = fr.id
      WHERE ufr.user_id = auth.uid() 
      AND fr.role_code IN ('CFO', 'SYSTEM_ADMIN')
      AND ufr.is_active = true
    )
  );

-- Insert/Update 11 Finance Roles
INSERT INTO public.finance_roles (role_code, role_name, role_category, access_level, description) VALUES
('CFO', 'Chief Financial Officer', 'executive', 'FULL_ADMIN', 'Full administrative access'),
('CONTROLLER', 'Controller', 'accounting', 'ACCOUNTING_ADMIN', 'Accounting administration'),
('VP_FINANCE', 'VP Finance/FP&A', 'fp&a', 'FP&A_ADMIN', 'FP&A leadership'),
('SENIOR_ACCOUNTANT', 'Senior Accountant', 'accounting', 'ACCOUNTING_ADMIN', 'Senior accounting'),
('STAFF_ACCOUNTANT', 'Staff Accountant', 'accounting', 'PROCESSOR', 'Junior accounting'),
('FPA_ANALYST', 'FP&A Analyst', 'fp&a', 'ANALYST', 'FP&A analysis'),
('AP_SPECIALIST', 'AP Specialist', 'accounting', 'PROCESSOR', 'Accounts payable'),
('AR_SPECIALIST', 'AR Specialist', 'accounting', 'PROCESSOR', 'Accounts receivable'),
('PAYROLL_SPECIALIST', 'Payroll Specialist', 'accounting', 'PROCESSOR', 'Payroll processing'),
('TREASURY_MANAGER', 'Treasury Manager', 'treasury', 'ACCOUNTING_ADMIN', 'Treasury management'),
('SYSTEM_ADMIN', 'Finance Systems Admin', 'systems', 'ACCOUNTING_ADMIN', 'System administration')
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_category = EXCLUDED.role_category,
  access_level = EXCLUDED.access_level,
  description = EXCLUDED.description;

-- Helper function for permissions
CREATE OR REPLACE FUNCTION public.has_finance_permission(
  p_user_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_finance_roles ufr
    JOIN public.finance_role_permissions frp ON ufr.role_id = frp.role_id
    JOIN public.finance_permissions fp ON frp.permission_id = fp.id
    WHERE ufr.user_id = p_user_id
    AND ufr.is_active = true
    AND (ufr.effective_to IS NULL OR ufr.effective_to > now())
    AND fp.permission_code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;