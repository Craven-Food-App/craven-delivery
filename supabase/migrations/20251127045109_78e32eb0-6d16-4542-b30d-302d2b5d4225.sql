-- Set Justin Sweet's Main Hub PIN to 101307 (permanent, no reset required)
-- Email: jsweet.cfo@cravenusa.com

-- Insert or update Justin Sweet's PIN in ceo_access_credentials
INSERT INTO public.ceo_access_credentials (
  user_email,
  pin_hash,
  updated_at
)
VALUES (
  'jsweet.cfo@cravenusa.com',
  '101307',
  now()
)
ON CONFLICT (user_email) DO UPDATE
SET 
  pin_hash = '101307',
  updated_at = now();

-- Verify it was set correctly
SELECT 
  user_email,
  CASE 
    WHEN pin_hash IS NOT NULL THEN '✅ PIN configured: ' || pin_hash
    ELSE '❌ PIN missing'
  END as status,
  last_access_at,
  access_count,
  updated_at
FROM public.ceo_access_credentials
WHERE user_email = 'jsweet.cfo@cravenusa.com';