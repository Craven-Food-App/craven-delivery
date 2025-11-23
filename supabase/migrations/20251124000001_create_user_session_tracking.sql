-- Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  portal_type TEXT NOT NULL, -- 'ceo', 'cfo', 'cto', 'coo', 'company', 'admin', 'board', 'hub'
  current_location TEXT, -- e.g., '/company/governance-admin', '/cto', '/hub'
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user_activity_log table for login/logout history
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'portal_enter', 'portal_exit', 'section_change')),
  portal_type TEXT, -- Which portal they're in
  location TEXT, -- Current page/section
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "CEO can view all sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid() AND role = 'ceo'
  )
);

CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can manage all sessions
CREATE POLICY "Service role can manage all sessions"
ON public.user_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for user_activity_log
CREATE POLICY "Users can view their own activity"
ON public.user_activity_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "CEO can view all activity"
ON public.user_activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exec_users
    WHERE user_id = auth.uid() AND role = 'ceo'
  )
);

CREATE POLICY "Users can insert their own activity"
ON public.user_activity_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role can manage all activity logs
CREATE POLICY "Service role can manage all activity logs"
ON public.user_activity_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_portal ON public.user_sessions(portal_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_type ON public.user_activity_log(activity_type);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

