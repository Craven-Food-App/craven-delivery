-- ============================================
-- COMPLETELY FIX BANKING RLS - NO RECURSION
-- ============================================
-- This migration removes ALL references to finance_employees from banking table policies
-- to prevent infinite recursion. Uses only direct role checks.

-- ============================================
-- FIX BANK_ACCOUNTS RLS (AGAIN - MORE PERMISSIVE)
-- ============================================

-- Drop all existing bank_accounts policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bank_accounts'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bank_accounts', pol.policyname);
  END LOOP;
END $$;

-- Create simple, non-recursive policies for bank_accounts
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
  OR EXISTS (
    SELECT 1 FROM public.finance_roles
    WHERE user_id = auth.uid()
    AND role IN ('CFO', 'Controller', 'Treasury', 'AP')
  )
);

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
  OR EXISTS (
    SELECT 1 FROM public.finance_roles
    WHERE user_id = auth.uid()
    AND role IN ('CFO', 'Controller', 'Treasury', 'AP')
  )
);

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
  OR EXISTS (
    SELECT 1 FROM public.finance_roles
    WHERE user_id = auth.uid()
    AND role IN ('CFO', 'Controller', 'Treasury', 'AP')
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
  OR EXISTS (
    SELECT 1 FROM public.finance_roles
    WHERE user_id = auth.uid()
    AND role IN ('CFO', 'Controller', 'Treasury', 'AP')
  )
);

-- ============================================
-- FIX ALL BANKING TABLES - NO FINANCE_EMPLOYEES REFERENCES
-- ============================================

-- Fix banking_transactions
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'banking_transactions'
  ) THEN
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'banking_transactions'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.banking_transactions', pol.policyname);
    END LOOP;

    CREATE POLICY "banking_transactions_all" ON public.banking_transactions
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
      OR EXISTS (
        SELECT 1 FROM public.finance_roles
        WHERE user_id = auth.uid()
        AND role IN ('CFO', 'Controller', 'Treasury')
      )
    );
  END IF;
END $$;

-- Fix wire_transfers
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wire_transfers'
  ) THEN
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'wire_transfers'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.wire_transfers', pol.policyname);
    END LOOP;

    CREATE POLICY "wire_transfers_all" ON public.wire_transfers
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
      OR EXISTS (
        SELECT 1 FROM public.finance_roles
        WHERE user_id = auth.uid()
        AND role IN ('CFO', 'Controller', 'Treasury')
      )
    );
  END IF;
END $$;

-- Fix ach_transfers
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ach_transfers'
  ) THEN
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ach_transfers'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.ach_transfers', pol.policyname);
    END LOOP;

    CREATE POLICY "ach_transfers_all" ON public.ach_transfers
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
      OR EXISTS (
        SELECT 1 FROM public.finance_roles
        WHERE user_id = auth.uid()
        AND role IN ('CFO', 'Controller', 'Treasury')
      )
    );
  END IF;
END $$;

-- Fix banking_reconciliations
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'banking_reconciliations'
  ) THEN
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'banking_reconciliations'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.banking_reconciliations', pol.policyname);
    END LOOP;

    CREATE POLICY "banking_reconciliations_all" ON public.banking_reconciliations
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
      OR EXISTS (
        SELECT 1 FROM public.finance_roles
        WHERE user_id = auth.uid()
        AND role IN ('CFO', 'Controller', 'Treasury')
      )
    );
  END IF;
END $$;

-- Fix cash_forecasts
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cash_forecasts'
  ) THEN
    FOR pol IN (
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND table_name = 'cash_forecasts'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.cash_forecasts', pol.policyname);
    END LOOP;

    CREATE POLICY "cash_forecasts_all" ON public.cash_forecasts
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
      OR EXISTS (
        SELECT 1 FROM public.finance_roles
        WHERE user_id = auth.uid()
        AND role IN ('CFO', 'Controller', 'Treasury')
      )
    );
  END IF;
END $$;

