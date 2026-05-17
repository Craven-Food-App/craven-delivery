
DROP POLICY IF EXISTS "Users can read own verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Users read own phone verifications" ON public.phone_verifications;
CREATE POLICY "Users read own phone verifications"
ON public.phone_verifications FOR SELECT TO authenticated
USING (email = (auth.jwt() ->> 'email') OR phone = (auth.jwt() ->> 'phone'));

DROP POLICY IF EXISTS "Employees can read their own record by id + pin" ON public.restaurant_employees;

DROP POLICY IF EXISTS "investor_demo_self_view" ON public.investor_demo_access;
DROP POLICY IF EXISTS "investor_demo_admin_view" ON public.investor_demo_access;
CREATE POLICY "investor_demo_admin_view"
ON public.investor_demo_access FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

ALTER TABLE public.finance_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read finance audit log" ON public.finance_audit_log;
CREATE POLICY "Admins read finance audit log"
ON public.finance_audit_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='finance_audit_log_2025_01') THEN
    EXECUTE 'ALTER TABLE public.finance_audit_log_2025_01 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read finance audit log partition" ON public.finance_audit_log_2025_01';
    EXECUTE 'CREATE POLICY "Admins read finance audit log partition" ON public.finance_audit_log_2025_01 FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='share_certificates_backup') THEN
    EXECUTE 'ALTER TABLE public.share_certificates_backup ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins read share certs backup" ON public.share_certificates_backup';
    EXECUTE 'CREATE POLICY "Admins read share certs backup" ON public.share_certificates_backup FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))';
  END IF;
END $$;

ALTER TABLE public.cto_performance_thresholds ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='code_change_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.code_change_requests', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "ccr_select_own_or_admin"
ON public.code_change_requests FOR SELECT TO authenticated
USING (developer_id = auth.uid() OR reviewer_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_ceo(auth.uid()));

CREATE POLICY "ccr_insert_own"
ON public.code_change_requests FOR INSERT TO authenticated
WITH CHECK (developer_id = auth.uid());

CREATE POLICY "ccr_update_admin"
ON public.code_change_requests FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_ceo(auth.uid()) OR reviewer_id = auth.uid())
WITH CHECK (public.is_admin(auth.uid()) OR public.is_ceo(auth.uid()) OR reviewer_id = auth.uid());

CREATE POLICY "ccr_delete_admin"
ON public.code_change_requests FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_ceo(auth.uid()));
