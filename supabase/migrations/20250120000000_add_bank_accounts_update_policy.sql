-- Create finance_roles table if it doesn't exist (needed for role-based policies)
CREATE TABLE IF NOT EXISTS public.finance_roles (
  user_id uuid not null,
  role text not null, -- CFO|Controller|AP|AR|Auditor|Treasury
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

ALTER TABLE public.finance_roles ENABLE ROW LEVEL SECURITY;

-- Create finance_roles policies if they don't exist
DROP POLICY IF EXISTS finance_roles_read ON public.finance_roles;
CREATE POLICY finance_roles_read ON public.finance_roles 
FOR SELECT 
USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS finance_roles_write ON public.finance_roles;
CREATE POLICY finance_roles_write ON public.finance_roles 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Create receivables table if it doesn't exist (for cash flow tracking)
CREATE TABLE IF NOT EXISTS public.receivables (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  reference text,
  amount numeric not null,
  currency text not null default 'USD',
  issue_date date not null,
  due_date date not null,
  status text not null default 'open', -- open|paid|disputed|written_off
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS receivables_due_idx ON public.receivables (due_date);

-- Create reconciliations table if it doesn't exist (for reconciliation management)
CREATE TABLE IF NOT EXISTS public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  period text not null, -- YYYY-MM
  type text not null, -- bank|ar|ap|deferred_rev
  status text not null default 'open', -- open|tied|exception
  notes text,
  created_at timestamptz not null default now()
);

-- Create invoices table if it doesn't exist (for cash flow tracking)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  invoice_number text not null,
  amount numeric not null,
  currency text not null default 'USD',
  invoice_date date not null,
  due_date date not null,
  status text not null default 'pending', -- pending|approved|paid
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS invoices_due_idx ON public.invoices (due_date);

-- Create bank_accounts table if it doesn't exist (for treasury operations)
-- This ensures the table exists before adding policies

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution text,
  currency text not null default 'USD',
  current_balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Enable RLS on all tables
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create read policies for receivables, reconciliations, and invoices
DROP POLICY IF EXISTS receivables_read ON public.receivables;
CREATE POLICY receivables_read ON public.receivables
FOR SELECT
USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS reconciliations_read ON public.reconciliations;
CREATE POLICY reconciliations_read ON public.reconciliations
FOR SELECT
USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS invoices_read ON public.invoices;
CREATE POLICY invoices_read ON public.invoices
FOR SELECT
USING (auth.role() IN ('authenticated', 'service_role'));

-- Create read policy for bank_accounts if it doesn't exist
DROP POLICY IF EXISTS bank_accounts_read ON public.bank_accounts;
CREATE POLICY bank_accounts_read ON public.bank_accounts
FOR SELECT
USING (auth.role() IN ('authenticated', 'service_role'));

-- Create insert policy if it doesn't exist
-- Uses direct query to check finance_roles table (works even if has_finance_role function doesn't exist yet)
-- Also allows admins from user_roles table
DROP POLICY IF EXISTS bank_accounts_write ON public.bank_accounts;
CREATE POLICY bank_accounts_write ON public.bank_accounts
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Add UPDATE policy for bank_accounts to allow treasury operations
-- This allows CFO, Controller, and Treasury roles to update bank account balances
-- Uses direct query to check finance_roles table (works even if has_finance_role function doesn't exist yet)
DROP POLICY IF EXISTS bank_accounts_update ON public.bank_accounts;

CREATE POLICY bank_accounts_update ON public.bank_accounts
FOR UPDATE
USING (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Also ensure DELETE policy exists for completeness
DROP POLICY IF EXISTS bank_accounts_delete ON public.bank_accounts;

CREATE POLICY bank_accounts_delete ON public.bank_accounts
FOR DELETE
USING (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Add UPDATE policy for reconciliations
DROP POLICY IF EXISTS reconciliations_update ON public.reconciliations;
CREATE POLICY reconciliations_update ON public.reconciliations
FOR UPDATE
USING (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Add INSERT policy for reconciliations (for creating new reconciliations)
DROP POLICY IF EXISTS reconciliations_insert ON public.reconciliations;
CREATE POLICY reconciliations_insert ON public.reconciliations
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.finance_roles fr
    WHERE fr.user_id = auth.uid() 
    AND fr.role IN ('Treasury', 'Controller', 'CFO')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

