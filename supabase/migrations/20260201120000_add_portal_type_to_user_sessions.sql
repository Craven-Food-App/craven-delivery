-- Add missing columns to user_sessions table
-- portal_type: tracks which portal the user is accessing (hub, testing, mobile, etc.)
-- is_active: tracks whether the session is currently active

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS portal_type TEXT;

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_portal_type 
ON user_sessions(portal_type)
WHERE portal_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
ON user_sessions(is_active)
WHERE is_active = true;

-- Add composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_portal_active 
ON user_sessions(user_id, portal_type, is_active)
WHERE portal_type IS NOT NULL AND is_active = true;

-- Add comments
COMMENT ON COLUMN user_sessions.portal_type IS 'Type of portal being accessed: hub, testing, mobile, etc.';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether this session is currently active';

