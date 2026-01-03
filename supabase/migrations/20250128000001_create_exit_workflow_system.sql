-- Exit/Firing Workflow System
-- Tracks the complete exit process for employees and executives
-- Aligns with Executive Removal Process document

-- Exit workflows table
CREATE TABLE IF NOT EXISTS public.exit_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Workflow type
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('employee_termination', 'executive_removal', 'resignation', 'retirement')),
  termination_type TEXT CHECK (termination_type IN ('for_cause', 'without_cause', 'resignation', 'retirement')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'board_approval_pending', -- For executives
    'board_approved',
    'board_rejected',
    'notice_sent',
    'access_revoked',
    'assets_returned',
    'final_settlement',
    'completed',
    'cancelled'
  )),
  
  -- Dates
  effective_date DATE NOT NULL,
  notice_date DATE,
  last_day DATE,
  
  -- Reasons and documentation
  termination_reason TEXT,
  grounds_for_cause TEXT[], -- Array of grounds if for_cause
  board_resolution_id UUID REFERENCES public.board_resolutions(id),
  
  -- Process tracking
  steps_completed JSONB DEFAULT '{}'::jsonb, -- Track which steps are done
  steps_required JSONB DEFAULT '{}'::jsonb,  -- Required steps based on employee type
  
  -- Final settlement
  final_compensation NUMERIC(12, 2),
  severance_amount NUMERIC(12, 2),
  unused_pto_days INTEGER DEFAULT 0,
  pto_payout NUMERIC(12, 2),
  final_pay_date DATE,
  
  -- Equity handling
  equity_vesting_status TEXT, -- 'forfeited', 'accelerated', 'standard'
  equity_notes TEXT,
  
  -- Access and assets
  access_revoked_at TIMESTAMP WITH TIME ZONE,
  access_revoked_by UUID REFERENCES auth.users(id),
  assets_returned_at TIMESTAMP WITH TIME ZONE,
  assets_returned_by UUID REFERENCES auth.users(id),
  assets_checklist JSONB DEFAULT '[]'::jsonb, -- List of assets to return
  
  -- Communication
  internal_notification_sent BOOLEAN DEFAULT false,
  external_notification_required BOOLEAN DEFAULT false,
  external_notification_sent BOOLEAN DEFAULT false,
  
  -- Notes and metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exit workflow steps log
CREATE TABLE IF NOT EXISTS public.exit_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.exit_workflows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Asset return tracking
CREATE TABLE IF NOT EXISTS public.exit_asset_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.exit_workflows(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'laptop', 'phone', 'access_card', 'keys', 'credit_card', 'documents', 'other'
  asset_description TEXT NOT NULL,
  asset_serial_number TEXT,
  returned BOOLEAN DEFAULT false,
  returned_at TIMESTAMP WITH TIME ZONE,
  returned_by UUID REFERENCES auth.users(id),
  condition_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Access revocation log
CREATE TABLE IF NOT EXISTS public.exit_access_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.exit_workflows(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL, -- 'email', 'github', 'slack', 'financial_systems', 'vpn', 'building_access', etc.
  access_type TEXT NOT NULL, -- 'read', 'write', 'admin', 'full'
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  email_forward_to TEXT, -- If email, where to forward
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exit_workflows_employee ON public.exit_workflows(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_workflows_status ON public.exit_workflows(status);
CREATE INDEX IF NOT EXISTS idx_exit_workflows_type ON public.exit_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_exit_workflows_board_resolution ON public.exit_workflows(board_resolution_id);
CREATE INDEX IF NOT EXISTS idx_exit_workflow_steps_workflow ON public.exit_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_exit_asset_returns_workflow ON public.exit_asset_returns(workflow_id);
CREATE INDEX IF NOT EXISTS idx_exit_access_revocations_workflow ON public.exit_access_revocations(workflow_id);

-- RLS Policies
ALTER TABLE public.exit_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_asset_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_access_revocations ENABLE ROW LEVEL SECURITY;

-- Policy: CEO and executives can manage exit workflows
CREATE POLICY "executives_manage_exit_workflows"
  ON public.exit_workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid() 
      AND role IN ('ceo', 'cfo', 'coo', 'cto', 'chro')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: HR can view and update exit workflows
CREATE POLICY "hr_view_exit_workflows"
  ON public.exit_workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "hr_update_exit_workflows"
  ON public.exit_workflows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'hr', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for workflow steps
CREATE POLICY "executives_manage_workflow_steps"
  ON public.exit_workflow_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- Policies for asset returns
CREATE POLICY "executives_manage_asset_returns"
  ON public.exit_asset_returns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- Policies for access revocations
CREATE POLICY "executives_manage_access_revocations"
  ON public.exit_access_revocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exec_users 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr', 'it')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'hr', 'it')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exit_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exit_workflows_updated_at
  BEFORE UPDATE ON public.exit_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_exit_workflow_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.exit_workflows IS 'Tracks complete exit/termination workflows for employees and executives';
COMMENT ON TABLE public.exit_workflow_steps IS 'Logs individual steps within exit workflows';
COMMENT ON TABLE public.exit_asset_returns IS 'Tracks return of company assets during exit process';
COMMENT ON TABLE public.exit_access_revocations IS 'Logs revocation of system access during exit process';

