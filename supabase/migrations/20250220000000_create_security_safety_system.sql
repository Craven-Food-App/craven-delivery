-- Security & Safety System
-- Comprehensive security features for driver app

-- 1. USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop', 'web'
  device_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  is_current_session BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id ON public.user_sessions(device_id);

-- RLS Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON public.user_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 2. LOGIN ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_type TEXT NOT NULL CHECK (login_type IN ('password', '2fa', 'biometric', 'session_refresh')),
  device_name TEXT,
  device_type TEXT,
  device_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON public.login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON public.login_activity(created_at DESC);

-- RLS Policies
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login activity"
  ON public.login_activity FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. TRUSTED DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT,
  device_id TEXT NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  bypass_2fa BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_id ON public.trusted_devices(device_id);

-- RLS Policies
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trusted devices"
  ON public.trusted_devices FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 4. 2FA BACKUP CODES TABLE
CREATE TABLE IF NOT EXISTS public.two_factor_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- Hashed backup code
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON public.two_factor_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_code_hash ON public.two_factor_backup_codes(code_hash);

-- RLS Policies
ALTER TABLE public.two_factor_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own backup codes"
  ON public.two_factor_backup_codes FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 5. SECURITY ALERTS SETTINGS (add to driver_preferences)
DO $$ 
BEGIN
  -- Add security-related columns to driver_preferences if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_preferences' 
    AND column_name = 'app_lock_enabled'
  ) THEN
    ALTER TABLE public.driver_preferences 
    ADD COLUMN app_lock_enabled BOOLEAN DEFAULT false,
    ADD COLUMN app_lock_type TEXT DEFAULT 'none' CHECK (app_lock_type IN ('none', 'pin', 'biometric')),
    ADD COLUMN app_lock_pin_hash TEXT,
    ADD COLUMN app_lock_timeout_seconds INTEGER DEFAULT 300, -- 5 minutes
    ADD COLUMN panic_button_enabled BOOLEAN DEFAULT true,
    ADD COLUMN share_location_with_emergency BOOLEAN DEFAULT false,
    ADD COLUMN auto_share_location_on_delivery BOOLEAN DEFAULT false,
    ADD COLUMN safety_checkin_reminder_minutes INTEGER,
    ADD COLUMN security_alert_password_change BOOLEAN DEFAULT true,
    ADD COLUMN security_alert_new_device BOOLEAN DEFAULT true,
    ADD COLUMN security_alert_2fa_change BOOLEAN DEFAULT true,
    ADD COLUMN security_alert_suspicious_login BOOLEAN DEFAULT true,
    ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
    ADD COLUMN two_factor_method TEXT DEFAULT 'sms' CHECK (two_factor_method IN ('sms', 'email', 'app'));
  END IF;
END $$;

-- 6. PANIC BUTTON LOGS TABLE
CREATE TABLE IF NOT EXISTS public.panic_button_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_address TEXT,
  emergency_services_called BOOLEAN DEFAULT false,
  emergency_contact_notified BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_panic_button_user_id ON public.panic_button_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_button_triggered_at ON public.panic_button_logs(triggered_at DESC);

-- RLS Policies
ALTER TABLE public.panic_button_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own panic button logs"
  ON public.panic_button_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own panic button logs"
  ON public.panic_button_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. FUNCTION: Log login activity
CREATE OR REPLACE FUNCTION public.log_login_activity(
  p_user_id UUID,
  p_login_type TEXT,
  p_device_name TEXT,
  p_device_type TEXT,
  p_device_id TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_location_city TEXT DEFAULT NULL,
  p_location_region TEXT DEFAULT NULL,
  p_location_country TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.login_activity (
    user_id, login_type, device_name, device_type, device_id,
    ip_address, user_agent, location_city, location_region, location_country,
    success, failure_reason
  ) VALUES (
    p_user_id, p_login_type, p_device_name, p_device_type, p_device_id,
    p_ip_address, p_user_agent, p_location_city, p_location_region, p_location_country,
    p_success, p_failure_reason
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- 8. FUNCTION: Create or update user session
CREATE OR REPLACE FUNCTION public.upsert_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_name TEXT,
  p_device_type TEXT,
  p_device_id TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_location_city TEXT DEFAULT NULL,
  p_location_region TEXT DEFAULT NULL,
  p_location_country TEXT DEFAULT NULL,
  p_is_current_session BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Mark other sessions as not current if this is the current session
  IF p_is_current_session THEN
    UPDATE public.user_sessions
    SET is_current_session = false
    WHERE user_id = p_user_id;
  END IF;
  
  INSERT INTO public.user_sessions (
    user_id, session_token, device_name, device_type, device_id,
    ip_address, user_agent, location_city, location_region, location_country,
    is_current_session, last_activity_at, expires_at
  ) VALUES (
    p_user_id, p_session_token, p_device_name, p_device_type, p_device_id,
    p_ip_address, p_user_agent, p_location_city, p_location_region, p_location_country,
    p_is_current_session, now(), now() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    session_token = EXCLUDED.session_token,
    last_activity_at = now(),
    expires_at = now() + INTERVAL '30 days',
    is_current_session = EXCLUDED.is_current_session
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- 9. FUNCTION: Generate 2FA backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(
  p_user_id UUID,
  p_count INTEGER DEFAULT 10
)
RETURNS TABLE(code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_code_hash TEXT;
  i INTEGER;
BEGIN
  -- Delete old unused codes
  DELETE FROM public.two_factor_backup_codes
  WHERE user_id = p_user_id AND used = false;
  
  -- Generate new codes
  FOR i IN 1..p_count LOOP
    -- Generate 8-digit code
    v_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    -- In production, hash this with bcrypt or similar
    v_code_hash := encode(digest(v_code || p_user_id::TEXT, 'sha256'), 'hex');
    
    INSERT INTO public.two_factor_backup_codes (
      user_id, code_hash, expires_at
    ) VALUES (
      p_user_id, v_code_hash, now() + INTERVAL '1 year'
    );
    
    RETURN QUERY SELECT v_code;
  END LOOP;
END;
$$;

-- 10. FUNCTION: Clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now() OR last_activity_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_login_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_backup_codes TO authenticated;

