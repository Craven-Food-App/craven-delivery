-- HR → Intern Program Handoff System
-- Single authoritative handoff from HR/Recruiting into Intern Program
-- Only triggers when HR_STATUS = 'Accepted' AND START_DATE is set

-- 1. HR Intern Candidates Table (Source System)
CREATE TABLE IF NOT EXISTS public.hr_intern_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  location TEXT,
  phone TEXT,
  
  -- Employment Details
  role_type TEXT NOT NULL DEFAULT 'INTERN' CHECK (role_type = 'INTERN'),
  track TEXT NOT NULL CHECK (track IN ('Technology', 'Strategy/Ops', 'Operations', 'Marketing')),
  start_date DATE,
  manager_id UUID REFERENCES public.employees(id),
  sponsor_id UUID REFERENCES public.employees(id),
  
  -- HR Status (NON-NEGOTIABLE TRIGGER)
  hr_status TEXT NOT NULL DEFAULT 'Draft' CHECK (hr_status IN (
    'Draft', 
    'Interviewed', 
    'Offered', 
    'Pending Acceptance', 
    'Background Check',
    'Accepted',
    'Withdrawn',
    'Terminated (Pre-start)'
  )),
  
  -- Handoff Status
  handoff_status TEXT DEFAULT 'Pending' CHECK (handoff_status IN ('Pending', 'Enrolled', 'Failed', 'Blocked')),
  handoff_error TEXT,
  handoff_enrolled_at TIMESTAMP WITH TIME ZONE,
  handoff_attempted_at TIMESTAMP WITH TIME ZONE,
  
  -- System
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_candidates_status ON public.hr_intern_candidates(hr_status);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_handoff_status ON public.hr_intern_candidates(handoff_status);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_email ON public.hr_intern_candidates(email);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_track ON public.hr_intern_candidates(track);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_created ON public.hr_intern_candidates(created_at DESC);

-- Enable RLS
ALTER TABLE public.hr_intern_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: HR and Admins can manage
DROP POLICY IF EXISTS "HR and admins can manage intern candidates" ON public.hr_intern_candidates;
CREATE POLICY "HR and admins can manage intern candidates"
  ON public.hr_intern_candidates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'hr', 'INTERN_PROGRAM_ADMIN'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "HR can view all candidates" ON public.hr_intern_candidates;
CREATE POLICY "HR can view all candidates"
  ON public.hr_intern_candidates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'hr', 'INTERN_PROGRAM_ADMIN'))
    OR EXISTS (SELECT 1 FROM public.exec_users WHERE user_id = auth.uid())
  );

-- 2. Function to validate handoff payload
CREATE OR REPLACE FUNCTION validate_hr_handoff_payload(
  p_candidate_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_candidate RECORD;
  v_track_exists BOOLEAN;
  v_manager_exists BOOLEAN;
  v_sponsor_exists BOOLEAN;
  v_duplicate_enrollment BOOLEAN;
  v_role_track_name TEXT;
BEGIN
  -- Fetch candidate
  SELECT * INTO v_candidate
  FROM public.hr_intern_candidates
  WHERE id = p_candidate_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Candidate not found'::TEXT;
    RETURN;
  END IF;
  
  -- Validate required fields
  IF v_candidate.first_name IS NULL OR TRIM(v_candidate.first_name) = '' THEN
    RETURN QUERY SELECT false, 'Missing required field: first_name'::TEXT;
    RETURN;
  END IF;
  
  IF v_candidate.last_name IS NULL OR TRIM(v_candidate.last_name) = '' THEN
    RETURN QUERY SELECT false, 'Missing required field: last_name'::TEXT;
    RETURN;
  END IF;
  
  IF v_candidate.email IS NULL OR TRIM(v_candidate.email) = '' THEN
    RETURN QUERY SELECT false, 'Missing required field: email'::TEXT;
    RETURN;
  END IF;
  
  IF v_candidate.track IS NULL OR TRIM(v_candidate.track) = '' THEN
    RETURN QUERY SELECT false, 'Missing required field: track'::TEXT;
    RETURN;
  END IF;
  
  IF v_candidate.start_date IS NULL THEN
    RETURN QUERY SELECT false, 'Missing required field: start_date'::TEXT;
    RETURN;
  END IF;
  
  -- Validate track exists (map to role track names)
  -- Map HR track names to role track names
  CASE v_candidate.track
    WHEN 'Technology' THEN v_role_track_name := 'Founder''s Office – Technology';
    WHEN 'Strategy/Ops' THEN v_role_track_name := 'Strategy & Operations';
    WHEN 'Operations' THEN v_role_track_name := 'Operations Management';
    WHEN 'Marketing' THEN v_role_track_name := 'Marketing & Brand';
    ELSE v_role_track_name := v_candidate.track;
  END CASE;
  
  SELECT EXISTS (
    SELECT 1 FROM public.intern_role_tracks 
    WHERE name = v_role_track_name AND is_active = true
  ) INTO v_track_exists;
  
  IF NOT v_track_exists THEN
    RETURN QUERY SELECT false, format('Invalid track: %s (mapped to: %s)', v_candidate.track, v_role_track_name)::TEXT;
    RETURN;
  END IF;
  
  -- Validate manager exists (if provided)
  IF v_candidate.manager_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_candidate.manager_id
    ) INTO v_manager_exists;
    
    IF NOT v_manager_exists THEN
      RETURN QUERY SELECT false, format('Invalid manager_id: %s', v_candidate.manager_id)::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Validate sponsor exists (if provided)
  IF v_candidate.sponsor_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.employees WHERE id = v_candidate.sponsor_id
    ) INTO v_sponsor_exists;
    
    IF NOT v_sponsor_exists THEN
      RETURN QUERY SELECT false, format('Invalid sponsor_id: %s', v_candidate.sponsor_id)::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check for duplicate active enrollment (same email, active engagement)
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees e
    JOIN public.promotion_engagements pe ON pe.person_id = e.id
    WHERE LOWER(e.email) = LOWER(v_candidate.email)
      AND pe.current_stage IN ('INTERN_ACTIVE', 'ACTING_EXECUTIVE', 'EXECUTIVE_OFFICER')
  ) INTO v_duplicate_enrollment;
  
  IF v_duplicate_enrollment THEN
    RETURN QUERY SELECT false, format('Duplicate active enrollment for email: %s', v_candidate.email)::TEXT;
    RETURN;
  END IF;
  
  -- Validate start date is not in the past (optional policy - can be relaxed)
  IF v_candidate.start_date < CURRENT_DATE THEN
    -- Allow past dates but log warning
    NULL;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to enroll intern (creates all required records)
CREATE OR REPLACE FUNCTION enroll_intern_from_hr_handoff(
  p_candidate_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  employee_id UUID,
  engagement_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_candidate RECORD;
  v_validation RECORD;
  v_user_id UUID;
  v_employee_id UUID;
  v_engagement_id UUID;
  v_track_id UUID;
  v_role_track_name TEXT;
  v_mandatory_tests UUID[];
  v_test_module_id UUID;
  v_audit_log_id UUID;
  v_existing_employee_id UUID;
BEGIN
  -- Fetch candidate
  SELECT * INTO v_candidate
  FROM public.hr_intern_candidates
  WHERE id = p_candidate_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Candidate not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update handoff attempted timestamp
  UPDATE public.hr_intern_candidates
  SET handoff_attempted_at = now()
  WHERE id = p_candidate_id;
  
  -- Validate payload
  SELECT * INTO v_validation
  FROM validate_hr_handoff_payload(p_candidate_id);
  
  IF NOT v_validation.is_valid THEN
    -- Update candidate with error
    UPDATE public.hr_intern_candidates
    SET handoff_status = 'Failed',
        handoff_error = v_validation.error_message,
        updated_at = now()
    WHERE id = p_candidate_id;
    
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, v_validation.error_message;
    RETURN;
  END IF;
  
  -- Check if user exists by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(v_candidate.email)
  LIMIT 1;
  
  -- If user doesn't exist, we'll need to create it via application code
  -- For now, return error if user doesn't exist
  IF v_user_id IS NULL THEN
    UPDATE public.hr_intern_candidates
    SET handoff_status = 'Failed',
        handoff_error = format('User account does not exist for email: %s. User must be created via Supabase Auth first.', v_candidate.email),
        updated_at = now()
    WHERE id = p_candidate_id;
    
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 
      format('User account does not exist for email: %s. User must be created via Supabase Auth first.', v_candidate.email)::TEXT;
    RETURN;
  END IF;
  
  -- Map track name to role track name
  CASE v_candidate.track
    WHEN 'Technology' THEN v_role_track_name := 'Founder''s Office – Technology';
    WHEN 'Strategy/Ops' THEN v_role_track_name := 'Strategy & Operations';
    WHEN 'Operations' THEN v_role_track_name := 'Operations Management';
    WHEN 'Marketing' THEN v_role_track_name := 'Marketing & Brand';
    ELSE v_role_track_name := v_candidate.track;
  END CASE;
  
  -- Check if employee already exists
  SELECT id INTO v_existing_employee_id
  FROM public.employees
  WHERE LOWER(email) = LOWER(v_candidate.email)
  LIMIT 1;
  
  IF v_existing_employee_id IS NOT NULL THEN
    -- Update existing employee
    UPDATE public.employees
    SET 
      user_id = v_user_id,
      first_name = v_candidate.first_name,
      last_name = v_candidate.last_name,
      phone = COALESCE(v_candidate.phone, phone),
      employment_type = 'intern',
      employment_status = 'active',
      start_date = v_candidate.start_date,
      position = 'Intern',
      manager_id = COALESCE(v_candidate.manager_id, manager_id),
      updated_at = now()
    WHERE id = v_existing_employee_id
    RETURNING id INTO v_employee_id;
  ELSE
    -- Create new employee record
    INSERT INTO public.employees (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      employment_type,
      employment_status,
      start_date,
      position,
      manager_id,
      hired_by
    )
    VALUES (
      v_user_id,
      v_candidate.first_name,
      v_candidate.last_name,
      v_candidate.email,
      v_candidate.phone,
      'intern',
      'active',
      v_candidate.start_date,
      'Intern',
      v_candidate.manager_id,
      v_candidate.created_by
    )
    RETURNING id INTO v_employee_id;
  END IF;
  
  -- Check if engagement already exists
  SELECT id INTO v_engagement_id
  FROM public.promotion_engagements
  WHERE person_id = v_employee_id
    AND current_stage = 'INTERN_ACTIVE'
  LIMIT 1;
  
  IF v_engagement_id IS NULL THEN
    -- Create promotion engagement
    INSERT INTO public.promotion_engagements (
      person_id,
      track,
      current_stage,
      current_title,
      start_date,
      notes
    )
    VALUES (
      v_employee_id,
      v_role_track_name,
      'INTERN_ACTIVE',
      'Intern',
      v_candidate.start_date,
      format('Enrolled via HR handoff from candidate_id: %s', p_candidate_id)
    )
    RETURNING id INTO v_engagement_id;
  ELSE
    -- Update existing engagement
    UPDATE public.promotion_engagements
    SET 
      track = v_role_track_name,
      current_stage = 'INTERN_ACTIVE',
      current_title = 'Intern',
      start_date = v_candidate.start_date,
      notes = COALESCE(notes || E'\n', '') || format('Re-enrolled via HR handoff from candidate_id: %s at %s', p_candidate_id, now()),
      updated_at = now()
    WHERE id = v_engagement_id;
  END IF;
  
  -- Get track ID for test assignments
  SELECT id INTO v_track_id
  FROM public.intern_role_tracks
  WHERE name = v_role_track_name AND is_active = true
  LIMIT 1;
  
  -- Assign mandatory onboarding tests
  -- Get tests marked for INTERN_ACTIVE state with Onboarding category
  SELECT ARRAY_AGG(DISTINCT id) INTO v_mandatory_tests
  FROM public.intern_test_modules
  WHERE is_archived = false
    AND 'INTERN_ACTIVE' = ANY(allowed_role_states)
    AND category = 'Onboarding';
  
  -- Also get recommended tests from role track playlist
  IF v_track_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT unnest) INTO v_mandatory_tests
    FROM (
      SELECT unnest(recommended_test_modules) FROM public.intern_role_tracks WHERE id = v_track_id
      UNION ALL
      SELECT unnest(COALESCE(v_mandatory_tests, ARRAY[]::UUID[]))
    ) t
    WHERE unnest IS NOT NULL;
  END IF;
  
  -- Assign tests
  IF v_mandatory_tests IS NOT NULL AND array_length(v_mandatory_tests, 1) > 0 THEN
    FOREACH v_test_module_id IN ARRAY v_mandatory_tests
    LOOP
      INSERT INTO public.intern_test_assignments (
        test_module_id,
        engagement_id,
        assigned_by,
        status,
        due_date
      )
      VALUES (
        v_test_module_id,
        v_engagement_id,
        COALESCE(v_candidate.created_by, (SELECT id FROM auth.users WHERE email = 'system@craven.com' LIMIT 1)),
        'Assigned',
        v_candidate.start_date + INTERVAL '14 days' -- Due 2 weeks after start
      )
      ON CONFLICT (test_module_id, engagement_id) DO NOTHING;
    END LOOP;
  END IF;
  
  -- Grant INTERN portal access only (via user_roles)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'INTERN')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update user_profiles role
  UPDATE public.user_profiles
  SET role = 'intern'
  WHERE user_id = v_user_id;
  
  -- Create audit log entry
  INSERT INTO public.intern_program_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    affected_user_id,
    reason,
    new_values
  )
  VALUES (
    COALESCE(v_candidate.created_by, (SELECT id FROM auth.users LIMIT 1)),
    'INTERN_ENROLLED',
    'engagement',
    v_engagement_id,
    v_user_id,
    format('Enrolled via HR handoff. Source: HR_HANDOFF. Candidate ID: %s', p_candidate_id),
    jsonb_build_object(
      'candidate_id', p_candidate_id,
      'track', v_candidate.track,
      'role_track_name', v_role_track_name,
      'start_date', v_candidate.start_date,
      'employee_id', v_employee_id,
      'engagement_id', v_engagement_id,
      'manager_id', v_candidate.manager_id,
      'sponsor_id', v_candidate.sponsor_id
    )
  )
  RETURNING id INTO v_audit_log_id;
  
  -- Update candidate handoff status
  UPDATE public.hr_intern_candidates
  SET handoff_status = 'Enrolled',
      handoff_enrolled_at = now(),
      handoff_error = NULL,
      updated_at = now()
  WHERE id = p_candidate_id;
  
  -- Trigger email notification (async, non-blocking)
  -- Note: This would typically be done via a queue or edge function call
  -- For now, we'll let the application code handle email sending
  
  -- Success
  RETURN QUERY SELECT true, v_employee_id, v_engagement_id, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Update candidate with error
    UPDATE public.hr_intern_candidates
    SET handoff_status = 'Failed',
        handoff_error = format('Enrollment error: %s', SQLERRM),
        updated_at = now()
    WHERE id = p_candidate_id;
    
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger function to automatically enroll on status change
CREATE OR REPLACE FUNCTION handle_hr_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Only trigger when HR_STATUS = 'Accepted' AND START_DATE is set
  IF NEW.hr_status = 'Accepted' 
     AND NEW.start_date IS NOT NULL
     AND (OLD.hr_status IS NULL OR OLD.hr_status != 'Accepted' OR OLD.start_date IS NULL)
     AND NEW.handoff_status IN ('Pending', 'Failed') THEN
    
    -- Attempt enrollment
    SELECT * INTO v_result
    FROM enroll_intern_from_hr_handoff(NEW.id);
    
    -- Log result (success/failure is handled in the function)
    NULL;
    
  END IF;
  
  -- Block enrollment if status is Withdrawn or Terminated
  IF NEW.hr_status IN ('Withdrawn', 'Terminated (Pre-start)') 
     AND (OLD.hr_status IS NULL OR OLD.hr_status NOT IN ('Withdrawn', 'Terminated (Pre-start)')) THEN
    UPDATE public.hr_intern_candidates
    SET handoff_status = 'Blocked',
        handoff_error = format('Enrollment blocked due to HR status: %s', NEW.hr_status),
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trigger_hr_status_change ON public.hr_intern_candidates;
CREATE TRIGGER trigger_hr_status_change
  AFTER INSERT OR UPDATE OF hr_status, start_date ON public.hr_intern_candidates
  FOR EACH ROW
  EXECUTE FUNCTION handle_hr_status_change();

-- 6. Function to manually trigger handoff (for admin use)
CREATE OR REPLACE FUNCTION manual_hr_handoff(
  p_candidate_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  employee_id UUID,
  engagement_id UUID,
  error_message TEXT
) AS $$
BEGIN
  -- Validate status
  IF NOT EXISTS (
    SELECT 1 FROM public.hr_intern_candidates
    WHERE id = p_candidate_id
      AND hr_status = 'Accepted'
      AND start_date IS NOT NULL
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 
      'Candidate must have hr_status = "Accepted" and start_date set'::TEXT;
    RETURN;
  END IF;
  
  -- Attempt enrollment
  RETURN QUERY SELECT * FROM enroll_intern_from_hr_handoff(p_candidate_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get handoff status for a candidate
CREATE OR REPLACE FUNCTION get_hr_handoff_status(
  p_candidate_id UUID
)
RETURNS TABLE (
  candidate_id UUID,
  hr_status TEXT,
  handoff_status TEXT,
  handoff_error TEXT,
  handoff_enrolled_at TIMESTAMP WITH TIME ZONE,
  employee_id UUID,
  engagement_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.id,
    hc.hr_status,
    hc.handoff_status,
    hc.handoff_error,
    hc.handoff_enrolled_at,
    e.id as employee_id,
    pe.id as engagement_id
  FROM public.hr_intern_candidates hc
  LEFT JOIN public.employees e ON LOWER(e.email) = LOWER(hc.email)
  LEFT JOIN public.promotion_engagements pe ON pe.person_id = e.id AND pe.current_stage = 'INTERN_ACTIVE'
  WHERE hc.id = p_candidate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add comments
COMMENT ON TABLE public.hr_intern_candidates IS 'HR/Recruiting system table for intern candidates. Only entries with hr_status="Accepted" and start_date set will trigger automatic enrollment into Intern Program.';
COMMENT ON COLUMN public.hr_intern_candidates.hr_status IS 'NON-NEGOTIABLE: Only "Accepted" status with start_date triggers enrollment. All other statuses are ignored.';
COMMENT ON COLUMN public.hr_intern_candidates.handoff_status IS 'Tracks handoff state: Pending, Enrolled, Failed, Blocked';
COMMENT ON FUNCTION enroll_intern_from_hr_handoff(UUID) IS 'Core enrollment function. Creates employee, engagement, assigns tests, grants permissions, and logs audit entry.';
COMMENT ON FUNCTION validate_hr_handoff_payload(UUID) IS 'Validates all required fields, track existence, manager/sponsor validity, and checks for duplicate enrollments.';

