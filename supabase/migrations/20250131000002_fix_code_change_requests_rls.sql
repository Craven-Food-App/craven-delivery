-- Fix RLS policy for code_change_requests to allow CEO and executives to create requests
-- This enables the CEO review workflow where code changes are submitted for CEO approval

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Developers can create change requests" ON public.code_change_requests;
DROP POLICY IF EXISTS "Developers and executives can create change requests" ON public.code_change_requests;
DROP POLICY IF EXISTS "Developers can view their own change requests" ON public.code_change_requests;
DROP POLICY IF EXISTS "Developers and executives can view change requests" ON public.code_change_requests;
DROP POLICY IF EXISTS "CTO and reviewers can update change requests" ON public.code_change_requests;
DROP POLICY IF EXISTS "CTO, CEO and reviewers can update change requests" ON public.code_change_requests;

-- Create SELECT policy - allow CEO and executives to view all requests (for the review queue)
CREATE POLICY "Developers and executives can view change requests"
  ON public.code_change_requests FOR SELECT
  TO authenticated
  USING (
    developer_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cto', 'cfo', 'coo', 'cxo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

-- Create a new policy that allows:
-- 1. Developers with proper permissions (existing requirement)
-- 2. CEO and executives (for CEO review workflow)
-- 3. Admins
CREATE POLICY "Developers and executives can create change requests"
  ON public.code_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the developer_id matches the current user
    developer_id = auth.uid()
    AND (
      -- Option 1: Developer has write permissions for the repository
      EXISTS (
        SELECT 1 FROM public.developer_permissions 
        WHERE developer_id = auth.uid() 
        AND repository = code_change_requests.repository 
        AND can_write = true 
        AND is_active = true
      )
      -- Option 2: User is CEO or executive (for CEO review workflow)
      OR EXISTS (
        SELECT 1 FROM public.exec_users 
        WHERE user_id = auth.uid() 
        AND role IN ('ceo', 'cto', 'cfo', 'coo', 'cxo')
      )
      -- Option 3: User is admin
      OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      )
      -- Option 4: Torrance CEO access (universal access)
      OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
      OR auth.jwt()->>'email' LIKE '%torrance%'
      OR auth.jwt()->>'email' LIKE '%tstroman%'
    )
  );

-- Also ensure CEO can update (approve/deny) all requests
DROP POLICY IF EXISTS "CTO and reviewers can update change requests" ON public.code_change_requests;
CREATE POLICY "CTO, CEO and reviewers can update change requests"
  ON public.code_change_requests FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cto', 'cfo', 'coo', 'cxo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid() AND role IN ('ceo', 'cto', 'cfo', 'coo', 'cxo'))
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.jwt()->>'email' = 'tstroman.ceo@cravenusa.com'
    OR auth.jwt()->>'email' LIKE '%torrance%'
    OR auth.jwt()->>'email' LIKE '%tstroman%'
  );

