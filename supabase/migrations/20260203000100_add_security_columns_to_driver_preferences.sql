-- Add missing security & safety columns to driver_preferences
-- This is a targeted fix to add only the new columns needed

ALTER TABLE public.driver_preferences 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_lock_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_lock_type TEXT DEFAULT 'none', -- 'none', 'pin', 'biometric'
ADD COLUMN IF NOT EXISTS app_lock_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS panic_button_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS share_location_with_emergency BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_share_location_on_delivery BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alert_password_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alert_new_device BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alert_suspicious_activity BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alert_location_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_export_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_export_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_export_last_request_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_logout_on_inactive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_logout_minutes INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS require_reauth_for_sensitive BOOLEAN DEFAULT true;

