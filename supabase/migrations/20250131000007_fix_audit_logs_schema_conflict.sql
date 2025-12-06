-- ============================================
-- FIX AUDIT_LOGS SCHEMA CONFLICT
-- ============================================
-- This migration ensures the audit_logs table matches the finance audit system schema
-- Handles both old schema (with user_id) and new schema (with entered_by)

DO $$
DECLARE
  v_has_user_id BOOLEAN;
  v_has_entered_by BOOLEAN;
  v_has_transaction_type BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'user_id'
  ) INTO v_has_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'entered_by'
  ) INTO v_has_entered_by;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs' 
    AND column_name = 'transaction_type'
  ) INTO v_has_transaction_type;
  
  -- If we have the old schema (user_id but no entered_by), migrate it
  IF v_has_user_id AND NOT v_has_entered_by THEN
    -- Add new columns from finance audit system
    ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS transaction_type TEXT,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS entered_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS flag_reason TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS has_documentation BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS documentation_count INTEGER DEFAULT 0;
    
    -- Migrate user_id to entered_by
    UPDATE public.audit_logs 
    SET entered_by = user_id 
    WHERE entered_by IS NULL AND user_id IS NOT NULL;
  END IF;
  
  -- If we have the new schema (entered_by but no user_id), add user_id for backward compatibility
  IF v_has_entered_by AND NOT v_has_user_id THEN
    ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    
    -- Migrate entered_by to user_id for backward compatibility
    UPDATE public.audit_logs 
    SET user_id = entered_by 
    WHERE user_id IS NULL AND entered_by IS NOT NULL;
  END IF;
  
  -- If neither exists, this is a fresh install - the finance audit migration will create it
END $$;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "finance_roles_can_view_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "finance_roles_can_manage_audit_logs" ON public.audit_logs;

-- Recreate policies that work with both schemas
CREATE POLICY "finance_roles_can_view_audit_logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.finance_roles WHERE user_id = auth.uid() AND role IN ('CFO', 'Controller', 'Treasury', 'AP', 'AR'))
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

CREATE POLICY "finance_roles_can_manage_audit_logs" ON public.audit_logs
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cfo'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM public.finance_roles WHERE user_id = auth.uid() AND role IN ('CFO', 'Controller'))
  OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
  OR auth.jwt()->>'email' LIKE '%torrance%'
);

