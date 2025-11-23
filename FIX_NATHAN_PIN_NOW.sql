-- IMMEDIATE FIX: Set Nathan Curry's Hub PIN to 570022
-- Run this in Supabase SQL Editor RIGHT NOW

-- Step 0: Enable pgcrypto extension (required for crypt function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Generate and set the PIN hash
INSERT INTO public.ceo_access_credentials (
  user_email,
  pin_hash,
  updated_at
)
VALUES (
  'natecurry.cto@cravenusa.com',
  crypt('570022', gen_salt('bf', 10)),
  now()
)
ON CONFLICT (user_email) DO UPDATE
SET 
  pin_hash = crypt('570022', gen_salt('bf', 10)),
  updated_at = now();

-- Step 2: Verify it was set
SELECT 
  user_email,
  CASE 
    WHEN pin_hash IS NOT NULL THEN '✅ PIN configured'
    ELSE '❌ PIN missing'
  END as status,
  last_access_at,
  access_count,
  updated_at
FROM public.ceo_access_credentials
WHERE user_email = 'natecurry.cto@cravenusa.com';

-- Step 3: Test the PIN verification
SELECT 
  public.verify_ceo_pin('natecurry.cto@cravenusa.com', '570022') as pin_verification_result;

