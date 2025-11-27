-- First, update existing status values to lowercase to match new convention
UPDATE executive_appointments 
SET status = LOWER(status)
WHERE status IN ('BOARD_ADOPTED', 'DRAFT', 'SECRETARY_APPROVED');

-- Map old status values to new workflow states
UPDATE executive_appointments 
SET status = CASE 
  WHEN status = 'draft' THEN 'draft'
  WHEN status = 'board_adopted' THEN 'authorized_to_offer'
  WHEN status = 'secretary_approved' THEN 'authorized_to_offer'
  ELSE 'draft'
END;

-- Create appointment_workflow_gates table
CREATE TABLE IF NOT EXISTS appointment_workflow_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES executive_appointments(id) ON DELETE CASCADE,
  gate_number INTEGER NOT NULL,
  gate_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  department_owner TEXT NOT NULL,
  required_documents TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  document_hashes TEXT[] DEFAULT '{}',
  rejection_reason TEXT,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, gate_number)
);

-- Create appointment_audit_log table
CREATE TABLE IF NOT EXISTS appointment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES executive_appointments(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  department TEXT,
  document_id UUID,
  document_hash TEXT,
  metadata_json JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update executive_appointments status constraint
ALTER TABLE executive_appointments 
DROP CONSTRAINT IF EXISTS executive_appointments_status_check;

ALTER TABLE executive_appointments 
ADD CONSTRAINT executive_appointments_status_check 
CHECK (status IN (
  'draft',
  'selected',
  'pending_comp_approval',
  'ready_for_board_authorization',
  'authorized_to_offer',
  'pending_employment_agreement',
  'pending_ip_confidentiality',
  'pending_personal_governance',
  'pending_fiduciary_binding',
  'pending_conflict_clearance',
  'pending_indemnification',
  'pending_equity_authorization',
  'shareholder_active',
  'plan_active',
  'equity_vesting_active',
  'compensation_live',
  'fully_appointed_active',
  'rejected'
));

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_appointment_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  gates_incomplete INTEGER;
  rejected_gates INTEGER;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  
  -- Check for rejected gates
  SELECT COUNT(*) INTO rejected_gates
  FROM appointment_workflow_gates
  WHERE appointment_id = NEW.id AND status = 'rejected';
  
  IF rejected_gates > 0 AND NEW.status != 'rejected' THEN
    RAISE EXCEPTION 'Cannot advance workflow: appointment has rejected gates';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_appointment_status ON executive_appointments;
CREATE TRIGGER validate_appointment_status
  BEFORE UPDATE ON executive_appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_status_transition();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointment_workflow_gates_appointment ON appointment_workflow_gates(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_workflow_gates_status ON appointment_workflow_gates(status);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_log_appointment ON appointment_audit_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_log_timestamp ON appointment_audit_log(timestamp DESC);

-- Enable RLS
ALTER TABLE appointment_workflow_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow gates
CREATE POLICY "Allow executives to view workflow gates"
  ON appointment_workflow_gates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'cfo', 'board_member')
    )
  );

CREATE POLICY "Allow admins to manage workflow gates"
  ON appointment_workflow_gates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for audit log
CREATE POLICY "Allow executives to view audit logs"
  ON appointment_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'cfo', 'board_member')
    )
  );

CREATE POLICY "Allow system to insert audit logs"
  ON appointment_audit_log FOR INSERT
  WITH CHECK (true);