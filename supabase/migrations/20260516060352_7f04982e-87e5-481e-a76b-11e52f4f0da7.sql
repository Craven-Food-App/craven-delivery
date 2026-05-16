-- =========================================================
-- 1) phone_verifications: remove anon-readable OTP exposure
-- =========================================================
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.phone_verifications') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='phone_verifications' AND cmd='SELECT' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.phone_verifications', p.policyname);
    END LOOP;
    EXECUTE 'ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY';
    -- Only the matching authenticated user (by user_id or email) can read their own verification
    EXECUTE $POL$
      CREATE POLICY "Users read own phone verifications"
      ON public.phone_verifications FOR SELECT TO authenticated
      USING (
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      )
    $POL$;
  END IF;
EXCEPTION WHEN undefined_column THEN
  -- Fallback if user_id column doesn't exist: only auth user by email
  EXECUTE 'ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY';
  EXECUTE $POL$
    CREATE POLICY "Users read own phone verifications"
    ON public.phone_verifications FOR SELECT TO authenticated
    USING (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  $POL$;
END $$;

-- =========================================================
-- 2) restaurant_employees: remove anon access to PIN codes
-- =========================================================
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.restaurant_employees') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='restaurant_employees' AND cmd='SELECT' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.restaurant_employees', p.policyname);
    END LOOP;
    EXECUTE 'ALTER TABLE public.restaurant_employees ENABLE ROW LEVEL SECURITY';
    EXECUTE $POL$
      CREATE POLICY "Restaurant owner or self reads employees"
      ON public.restaurant_employees FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id = restaurant_employees.restaurant_id
            AND r.owner_id = auth.uid()
        )
        OR user_id = auth.uid()
        OR public.is_user_admin(auth.uid())
      )
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 3) finance_audit_log + finance_audit_log_2025_01: enable RLS
-- =========================================================
DO $$
BEGIN
  IF to_regclass('public.finance_audit_log') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.finance_audit_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read finance audit log" ON public.finance_audit_log';
    EXECUTE $POL$
      CREATE POLICY "Admins read finance audit log"
      ON public.finance_audit_log FOR SELECT TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.finance_audit_log_2025_01') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.finance_audit_log_2025_01 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read finance audit log 2025_01" ON public.finance_audit_log_2025_01';
    EXECUTE $POL$
      CREATE POLICY "Admins read finance audit log 2025_01"
      ON public.finance_audit_log_2025_01 FOR SELECT TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 4) admin_audit_logs: drop USING(true) policies, restrict to admins
-- =========================================================
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='admin_audit_logs' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_audit_logs', p.policyname);
    END LOOP;
    EXECUTE 'ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE $POL$
      CREATE POLICY "Admins read admin audit logs"
      ON public.admin_audit_logs FOR SELECT TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "Admins insert admin audit logs"
      ON public.admin_audit_logs FOR INSERT TO authenticated
      WITH CHECK (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 5) disputes / dispute_messages / support_tickets / ticket_messages
--    Remove "Admins access ..." USING(true) policies; only admins + parties
-- =========================================================
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('disputes','dispute_messages','support_tickets','ticket_messages')
      AND policyname ILIKE 'Admins access%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.disputes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins manage disputes" ON public.disputes';
    EXECUTE $POL$
      CREATE POLICY "Admins manage disputes"
      ON public.disputes FOR ALL TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;

  IF to_regclass('public.dispute_messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins manage dispute messages" ON public.dispute_messages';
    EXECUTE $POL$
      CREATE POLICY "Admins manage dispute messages"
      ON public.dispute_messages FOR ALL TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;

  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins manage support tickets" ON public.support_tickets';
    EXECUTE $POL$
      CREATE POLICY "Admins manage support tickets"
      ON public.support_tickets FOR ALL TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;

  IF to_regclass('public.ticket_messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins manage ticket messages" ON public.ticket_messages';
    EXECUTE $POL$
      CREATE POLICY "Admins manage ticket messages"
      ON public.ticket_messages FOR ALL TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 6) users.password_hash: revoke column-level SELECT
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='password_hash'
  ) THEN
    EXECUTE 'REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 7) permissions, roles: enable RLS, authenticated read only
-- =========================================================
DO $$
BEGIN
  IF to_regclass('public.permissions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read permissions" ON public.permissions';
    EXECUTE 'CREATE POLICY "Authenticated read permissions" ON public.permissions FOR SELECT TO authenticated USING (true)';
  END IF;
  IF to_regclass('public.roles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read roles" ON public.roles';
    EXECUTE 'CREATE POLICY "Authenticated read roles" ON public.roles FOR SELECT TO authenticated USING (true)';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 8) share_certificates_backup: enable RLS, exec only
-- =========================================================
DO $$
BEGIN
  IF to_regclass('public.share_certificates_backup') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.share_certificates_backup ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Execs and owner read share certs backup" ON public.share_certificates_backup';
    EXECUTE $POL$
      CREATE POLICY "Execs and owner read share certs backup"
      ON public.share_certificates_backup FOR SELECT TO authenticated
      USING (
        recipient_user_id = auth.uid()
        OR public.is_user_admin(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 9) investor_demo_access: lock to matching investor or admin
-- =========================================================
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.investor_demo_access') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='investor_demo_access' AND cmd='SELECT' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.investor_demo_access', p.policyname);
    END LOOP;
    EXECUTE 'ALTER TABLE public.investor_demo_access ENABLE ROW LEVEL SECURITY';
    EXECUTE $POL$
      CREATE POLICY "Investor or admin reads own demo access"
      ON public.investor_demo_access FOR SELECT TO authenticated
      USING (
        (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        OR public.is_user_admin(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 10) mailboxes.encrypted_app_password: revoke column SELECT
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mailboxes' AND column_name='encrypted_app_password'
  ) THEN
    EXECUTE 'REVOKE SELECT (encrypted_app_password) ON public.mailboxes FROM anon, authenticated';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- 11) cto_performance_thresholds: enable RLS, restrict
-- =========================================================
DO $$
BEGIN
  IF to_regclass('public.cto_performance_thresholds') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.cto_performance_thresholds ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read CTO thresholds" ON public.cto_performance_thresholds';
    EXECUTE $POL$
      CREATE POLICY "Admins read CTO thresholds"
      ON public.cto_performance_thresholds FOR SELECT TO authenticated
      USING (public.is_user_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    $POL$;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
