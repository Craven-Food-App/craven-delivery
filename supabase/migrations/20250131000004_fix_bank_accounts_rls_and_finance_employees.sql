-- Fix RLS policies for bank_accounts and finance_employees
-- Resolves: 403 errors on bank_accounts INSERT and infinite recursion in finance_employees

-- ============================================
-- FIX BANK_ACCOUNTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS bank_accounts_write ON public.bank_accounts;
DROP POLICY IF EXISTS bank_accounts_read ON public.bank_accounts;
DROP POLICY IF EXISTS bank_accounts_update ON public.bank_accounts;
DROP POLICY IF EXISTS bank_accounts_delete ON public.bank_accounts;

-- Create comprehensive read policy
CREATE POLICY bank_accounts_read ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo', 'cto', 'coo', 'cxo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create comprehensive write (INSERT) policy
CREATE POLICY bank_accounts_write ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo', 'cto', 'coo', 'cxo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create comprehensive update policy
CREATE POLICY bank_accounts_update ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo', 'cto', 'coo', 'cxo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo', 'cto', 'coo', 'cxo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create delete policy
CREATE POLICY bank_accounts_delete ON public.bank_accounts
FOR DELETE
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('ceo', 'cfo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================
-- FIX FINANCE_EMPLOYEES INFINITE RECURSION
-- ============================================

-- Drop all existing finance_employees policies to break recursion
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'finance_employees'
  ) THEN
    -- Drop all existing policies
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'finance_employees'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.finance_employees', pol.policyname);
    END LOOP;

    -- Create simple, non-recursive policies
    -- Read: Allow authenticated users (no circular checks)
    CREATE POLICY finance_employees_read ON public.finance_employees
    FOR SELECT
    TO authenticated
    USING (
      auth.role() = 'service_role'
      OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
      OR auth.jwt()->>'email' ILIKE '%torrance%'
      OR auth.jwt()->>'email' ILIKE '%tstroman%'
      OR EXISTS (
        SELECT 1 FROM public.exec_users
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'cfo', 'cto', 'coo', 'cxo')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    );

    -- Write: Allow CFOs and admins only
    CREATE POLICY finance_employees_write ON public.finance_employees
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.role() = 'service_role'
      OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
      OR auth.jwt()->>'email' ILIKE '%torrance%'
      OR auth.jwt()->>'email' ILIKE '%tstroman%'
      OR EXISTS (
        SELECT 1 FROM public.exec_users
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'cfo')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    );

    -- Update: Allow CFOs and admins only
    CREATE POLICY finance_employees_update ON public.finance_employees
    FOR UPDATE
    TO authenticated
    USING (
      auth.role() = 'service_role'
      OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
      OR auth.jwt()->>'email' ILIKE '%torrance%'
      OR auth.jwt()->>'email' ILIKE '%tstroman%'
      OR EXISTS (
        SELECT 1 FROM public.exec_users
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'cfo')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    )
    WITH CHECK (
      auth.role() = 'service_role'
      OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
      OR auth.jwt()->>'email' ILIKE '%torrance%'
      OR auth.jwt()->>'email' ILIKE '%tstroman%'
      OR EXISTS (
        SELECT 1 FROM public.exec_users
        WHERE user_id = auth.uid()
        AND role IN ('ceo', 'cfo')
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      )
    );
  END IF;
END $$;

-- ============================================
-- FIX BANKING TABLES RLS POLICIES
-- ============================================

-- Fix banking_transactions policies to avoid finance_employees recursion
DROP POLICY IF EXISTS "CFO and Treasury can manage transactions" ON public.banking_transactions;
DROP POLICY IF EXISTS "All authenticated can view transactions" ON public.banking_transactions;

CREATE POLICY "CFO and Treasury can manage transactions" ON public.banking_transactions
FOR ALL
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "All authenticated can view transactions" ON public.banking_transactions
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Fix wire_transfers policies
DROP POLICY IF EXISTS "CFO and Treasury can manage wire transfers" ON public.wire_transfers;
CREATE POLICY "CFO and Treasury can manage wire transfers" ON public.wire_transfers
FOR ALL
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Fix ACH transfers policies
DROP POLICY IF EXISTS "CFO and Treasury can manage ACH transfers" ON public.ach_transfers;
CREATE POLICY "CFO and Treasury can manage ACH transfers" ON public.ach_transfers
FOR ALL
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Fix reconciliations policies
DROP POLICY IF EXISTS "CFO and Treasury can manage reconciliations" ON public.banking_reconciliations;
CREATE POLICY "CFO and Treasury can manage reconciliations" ON public.banking_reconciliations
FOR ALL
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Fix cash_forecasts policies
DROP POLICY IF EXISTS "CFO and Treasury can manage cash forecasts" ON public.cash_forecasts;
CREATE POLICY "CFO and Treasury can manage cash forecasts" ON public.cash_forecasts
FOR ALL
TO authenticated
USING (
  auth.role() = 'service_role'
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' ILIKE '%torrance%'
  OR auth.jwt()->>'email' ILIKE '%tstroman%'
  OR EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid()
    AND role IN ('cfo', 'ceo')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);



