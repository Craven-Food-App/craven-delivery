-- Add feature toggle for About Us stats section visibility
-- This allows marketing team to show/hide the stats section (Active Users, Restaurant Partners, etc.)

INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'feature_about_us_stats_visible',
  '{"enabled": true}'::jsonb,
  'Controls whether the stats section (Active Users, Restaurant Partners, Delivery Drivers, Cities Served) is visible on the About Us page'
)
ON CONFLICT (setting_key) DO NOTHING;

