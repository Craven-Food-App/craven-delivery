-- Set Nathan Curry's Hub PIN to 570022
-- Email: natecurry.cto@cravenusa.com
-- This allows access to the main Hub

-- Insert or update the PIN for Nathan Curry
INSERT INTO public.ceo_access_credentials (
  user_email,
  pin_hash,
  updated_at
)
VALUES (
  'natecurry.cto@cravenusa.com',
  '570022',
  now()
)
ON CONFLICT (user_email) DO UPDATE
SET 
  pin_hash = '570022',
  updated_at = now();

-- Verify the PIN was set
SELECT 
  user_email,
  CASE 
    WHEN pin_hash IS NOT NULL THEN '✅ PIN configured'
    ELSE '❌ PIN missing'
  END as status,
  last_access_at,
  access_count
FROM public.ceo_access_credentials
WHERE user_email = 'natecurry.cto@cravenusa.com';