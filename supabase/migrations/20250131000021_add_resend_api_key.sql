-- Add Resend API key to admin_settings
-- This allows the send-driver-waitlist-email function to fetch the API key from the database

INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'resend_api_key',
  '"re_f3TftdAm_B87v2kBxFyEAEnuQJLEGinLf"'::jsonb,
  'Resend API key for sending transactional emails'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = '"re_f3TftdAm_B87v2kBxFyEAEnuQJLEGinLf"'::jsonb,
  updated_at = NOW();






